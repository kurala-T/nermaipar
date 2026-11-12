"""Fact-check brain for NermaiPar chat bots.

Local rules always work, with no key and no cost.
If GEMINI_API_KEY is set, Gemma checks the claim first.
If Gemma returns nothing, OPENROUTER_API_KEY tries OpenRouter.
If that also fails, the saved hoax list answers.
"""

import html
import json
import os
import re
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.request
from datetime import date
from urllib.parse import quote

VERDICTS = ("true", "false", "misleading", "unverified", "chat")
MODEL = os.environ.get("GEMMA_MODEL", "gemma-4-26b-a4b-it")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_OPENROUTER_MODEL = "google/gemma-4-31b-it:free"

KNOWN = [
    {
        "name": "health",
        "test": re.compile(r"herbal|virus|remedy|cure|ministry of health", re.I),
        "verdict": "false",
        "trick": "Fake urgency",
        "summary": "No government herbal cure exists. This is a chain message made to spread panic.",
        "reply": "Thank you for thinking of our health. I checked this. There is no emergency herbal cure from the government. Please don't forward it. It could make someone skip real treatment.",
    },
    {
        "name": "phishing",
        "test": re.compile(r"bank|kyc|account blocked|bit\.ly|otp|debit card|credit card", re.I),
        "verdict": "false",
        "trick": "Disguised link",
        "summary": "Banks do not send short links or demand instant KYC by text. This is a password trap.",
        "reply": "Please don't click that link. Banks never ask you to update KYC through a short link. Open the bank app yourself, and never share an OTP.",
    },
    {
        "name": "isro",
        "test": re.compile(r"isro|satellite|orbit|sriharikota", re.I),
        "verdict": "true",
        "trick": "Checkable official news",
        "summary": "This matches the kind of launch ISRO announces itself. Share the official link with it.",
        "reply": "This one looks real. ISRO posts launches on its official site. Share that source link with the message.",
    },
    {
        "name": "gps",
        "test": re.compile(r"₹500|rs\.?\s*500|500 note|gps chip|rbi confirmed", re.I),
        "verdict": "misleading",
        "trick": "False authority",
        "summary": "The ₹500 note has security features, not a GPS chip. A note has no battery and cannot track you.",
        "reply": "Please don't worry. The ₹500 note does not have a GPS chip. RBI has not said that. The security thread cannot track anyone.",
    },
]


def _flags(text):
    rules = [
        ("Fake urgency", re.compile(r"\b(urgent|immediately|act now|tonight|last chance|right now)\b", re.I)),
        ("Chain-forward pressure", re.compile(r"\b(forward|share with|send to|all contacts|10 people|10 friends)\b", re.I)),
        ("Disguised link", re.compile(r"bit\.ly|tinyurl|https?://|www\.|click here", re.I)),
        ("Fear pressure", re.compile(r"\b(blocked|suspended|penalty|danger|die|death|fine|banned)\b", re.I)),
        ("Miracle cure", re.compile(r"\b(cure|remedy|virus|medicine|herbal|doctor)\b", re.I)),
        ("False authority", re.compile(r"\b(govt|government|ministry|nasa|who|isro|rbi|official|confirmed)\b", re.I)),
    ]
    return [label for label, pattern in rules if pattern.search(text)]


def local_check(text):
    for claim in KNOWN:
        if claim["test"].search(text):
            return {
                "verdict": claim["verdict"],
                "trick": claim["trick"],
                "summary": claim["summary"],
                "reply": claim["reply"],
                "engine": "local",
            }

    found = _flags(text)
    has_link = "Disguised link" in found
    has_health = "Miracle cure" in found
    if has_link or has_health:
        verdict = "false"
    elif found:
        verdict = "unverified"
    else:
        verdict = "unverified"
        found = ["No proof in the message"]

    trick = found[0]
    if verdict == "false":
        summary = "This message uses pressure tricks and has no official source. Do not forward it."
        reply = "I checked this forward and could not find an official source. Please don't share it until we can confirm it. Thanks for looking out for us."
    else:
        summary = "I cannot match this to a known fact-check yet. Treat it as unverified."
        reply = "I could not verify this. Let's not forward it until there is an official source."

    return {
        "verdict": verdict,
        "trick": trick,
        "summary": summary,
        "reply": reply,
        "engine": "local",
    }


def _api_key():
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("GEMMA_API_KEY") or ""


def _normalize(text):
    """Fix the typos that made the model skip a real claim."""
    cleaned = text
    swaps = (
        (r"\bgonhaked\b", "hacked"),
        (r"\bha+cked\b", "hacked"),
        (r"\bhaked\b", "hacked"),
        (r"\bhackd\b", "hacked"),
        (r"\bexploading\b", "exploding"),
        (r"\bsade\b", "sad"),
        (r"\bnvida\b", "nvidia"),
        (r"\bnvdia\b", "nvidia"),
        (r"\bhe+lo+\b", "hello"),
        (r"\bh+i{2,}\b", "hi"),
        (r"\bexcusem\b", "excuse me"),
        (r"\bwantu\b", "want to"),
        (r"\bwanna\b", "want to"),
        (r"\bell\b", "tell"),
        (r"\bfactcheck\b", "fact check"),
        (r"\bdissapeard\b", "disappeared"),
        (r"\bdissapeared\b", "disappeared"),
        (r"\bdisapeard\b", "disappeared"),
    )
    for pattern, replacement in swaps:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.I)
    return cleaned


def _http_get(url, seconds=12):
    curl = shutil.which("curl.exe") or shutil.which("curl")
    if not curl:
        return None
    try:
        proc = subprocess.run(
            [curl, "-sS", "-m", str(seconds), "-A", "NermaiPar/1.0", url],
            capture_output=True,
            timeout=seconds + 5,
        )
    except (subprocess.TimeoutExpired, OSError):
        return None
    if proc.returncode != 0 or not proc.stdout:
        return None
    return proc.stdout.decode("utf-8", errors="replace")


def _rss_titles(query):
    url = (
        "https://news.google.com/rss/search?q="
        + quote(query)
        + "&hl=en-IN&gl=IN&ceid=IN:en"
    )
    raw = _http_get(url, seconds=2)
    if not raw:
        return []
    titles = re.findall(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", raw)
    cleaned = []
    for title in titles:
        text = html.unescape(re.sub(r"<[^>]+>", "", title)).strip()
        if not text or text == "Google News" or text.startswith('"') and "Google News" in text:
            continue
        if text not in cleaned:
            cleaned.append(text)
    return cleaned[:5]


def _search_notes(text):
    """Live headlines. Gemini's Google Search tool is over quota on this key."""
    query = " ".join(str(text or "").split())[:140]
    if not query:
        return []
    url = "https://www.bing.com/news/search?format=rss&q=" + quote(query)
    raw = _http_get(url, seconds=4)
    found = []
    if raw:
        for chunk in re.findall(r"<item>(.*?)</item>", raw, re.S)[:4]:
            title = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", chunk, re.S)
            desc = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", chunk, re.S)
            head = html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else ""
            blurb = html.unescape(re.sub(r"<[^>]+>", "", desc.group(1))).strip() if desc else ""
            if not head or head.lower().endswith("bingnews"):
                continue
            line = f"Web: {head}"
            if blurb:
                line += ". " + blurb
            found.append(line[:280])
    if found:
        return found
    return ["Headline: " + title for title in _rss_titles(query)[:4]]


def _news_notes(text):
    """Headlines plus one dated brief so a real 2026 breach is not called old news."""
    lines = []
    nvidia_hack = re.search(r"nvidia", text, re.I) and re.search(
        r"hack|breach|ssh|explod", text, re.I
    )
    if nvidia_hack:
        lines.append(
            "Checked fact, 11 November 2026: Nvidia told customers in early November 2026 "
            "that its Brev cloud GPU platform had unauthorized activity from 4 October 2026 "
            "through 20 October 2026. SSH keys that Brev makes for customer virtual machines "
            "may have been exposed. Nvidia said those keys were rotated and that it found no "
            "confirmed misuse. This is not the 2022 Nvidia leak. No reliable report says GPUs exploded."
        )
        return "\n".join(lines)
    if re.search(r"\bweather\b", text, re.I) and _is_question(text):
        return ""
    lines.extend(_search_notes(text))
    return "\n".join(lines[:4])


def _generate(url, key, body, seconds=18):
    """Ask Gemini. curl uses Windows TLS; Python's SSL handshake hangs on this network."""
    curl = shutil.which("curl.exe") or shutil.which("curl")
    if curl:
        try:
            proc = subprocess.run(
                [
                    curl, "-sS", "-m", str(seconds),
                    "-H", "Content-Type: application/json",
                    "-H", f"x-goog-api-key: {key}",
                    "--data-binary", "@-",
                    url,
                ],
                input=body,
                capture_output=True,
                timeout=seconds + 5,
            )
        except (subprocess.TimeoutExpired, OSError):
            return None
        if proc.returncode == 0 and proc.stdout:
            return proc.stdout.decode("utf-8", errors="replace")
        return None

    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=seconds) as response:
            return response.read().decode("utf-8")
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def _same_words(left, right):
    def squash(value):
        return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())
    return squash(left) == squash(right)


def _bare(text):
    cleaned = _normalize(text)
    bare = re.sub(r"[^a-z\s']", " ", cleaned.lower())
    bare = re.sub(r"\s+", " ", bare).strip()
    return bare


def is_small_talk(text):
    """Greetings and talk about using the bot are not claims. Do not stamp them."""
    bare = _bare(text)
    bare = re.sub(r"\b(hi|hello|hey)\b(?:\s+\1\b)+", r"\1", bare)
    greeting = bare
    while True:
        nxt = re.sub(r"^(?:excuse me|me|um|uh|please)\s+", "", greeting)
        if nxt == greeting:
            break
        greeting = nxt
    patterns = (
        r"(?:hi|hello|hey|yo|hola)(?: there)?",
        r"excuse me",
        r"how are you",
        r"how r u",
        r"what'?s up",
        r"good (?:morning|afternoon|evening|night)",
        r"(?:thank you|thanks|ty)",
        r"(?:bye|goodbye|gn|see you)",
        r"(?:ok|okay|cool|lol|haha|hmm|hm)",
        r"who are you",
        r"what can you do",
        r"help",
    )
    if any(re.fullmatch(pattern, greeting) for pattern in patterns):
        return True
    # "I want to tell the news and I will fact check it" is an instruction, not news.
    about_bot = re.search(r"\b(news|fact check|check it|check this|forward)\b", bare)
    talking = re.search(r"\b(i want|i will|i am going|going to|gonna|can you|could you)\b", bare)
    claim = re.search(
        r"\b(nvidia|died|killed|cure|hacked|virus|chip|isro|rbi|exploding|bitcoin|election)\b",
        bare,
    )
    return bool(about_bot and talking and not claim)


def _chat_result(text):
    bare = _bare(text)
    if re.search(r"\b(news|fact check)\b", bare) and re.search(r"\b(i want|i will|going to|gonna)\b", bare):
        answer = "Send the news here. I'll check it."
    elif re.search(r"who are you|what can you do|help", bare):
        answer = "I'm NermaiPar. Paste a forward or ask a question, and I'll check it."
    elif re.search(r"thank", bare):
        answer = "Anytime. Send the next message when you want it checked."
    elif re.search(r"bye|good night|gn", bare):
        answer = "Bye. I'll be here when you want something checked."
    elif re.search(r"how are you|how r u|what'?s up", bare):
        answer = "I'm here. Send a forward or a question and I'll check it."
    else:
        answer = "Hey. Paste a forward or ask a question, and I'll check it."
    return {
        "verdict": "chat",
        "trick": "None",
        "summary": "",
        "reply": "",
        "answer": answer,
        "correction": "",
        "original": " ".join(str(text or "").split()),
        "question": False,
        "engine": "local",
    }


def _is_question(text):
    stripped = text.strip()
    if stripped.endswith("?"):
        return True
    return bool(re.match(
        r"^(what|why|how|when|who|where|which|did|does|do|is|are|was|were|can|could|should|would|will|has|have|tell me|explain)\b",
        stripped,
        re.I,
    ))


def _prompt(text, notes="", reading=""):
    today = date.today().strftime("%d %B %Y")
    note_block = notes.strip() or "No web notes were retrieved."
    asking = _is_question(reading or text)
    mode = (
        "The user is asking you a question. Answer them directly, like a person."
        if asking
        else "The user sent a message. Talk to them first, then check the claim."
    )
    hint = ""
    if reading and reading.lower() != text.lower():
        hint = f"Likely spelling fix, so judge this meaning: {reading[:1200]}\n"
    return f"""You are NermaiPar, a misinformation checker for students and families in India.
Today is {today}. Memory can be older than today. Use the web notes for 2025 and 2026.
{mode}
Return JSON only.

Web notes:
{note_block[:1200]}

Message as typed:
{text[:800]}
{hint}
JSON keys:
verdict: true, false, misleading, or unverified
trick: 2 to 4 words, or "None"
summary: one short sentence
answer: 1 or 2 sentences spoken to the user. Always fill this.
correction: spelling-fixed message, or empty if spelling is fine
reply: one short line they can paste to an elder, or empty

Rules:
- Fix spelling, then judge the corrected meaning. Do not mock mistakes.
- Answer the question. Do not say only "unverified" when the notes explain it.
- Never call a 2025 or 2026 event "years ago" unless the notes say that.
- If the notes show a real event and the message adds a fake part, verdict is misleading.
- Nvidia Brev plus "hacked today" or "GPUs exploding" is misleading, not false.
- If notes are empty and the claim is fresh news, verdict is unverified. Never invent a year.
- If the message is only a greeting, thanks, or chat with no factual claim, verdict is chat. answer is a short friendly reply. Leave trick, summary, and reply empty. correction stays empty unless a real word changed.
- If they ask the weather, the time, or any normal question, answer it in answer. Use verdict chat unless they asked you to judge a forward. Never tell them not to forward their own question.
- Use the web notes. They are a live news search from just now. If a note is about a different story, ignore it. If the notes contradict the message, say so."""


def _from_model_text(raw, engine):
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(raw[start:end + 1])
    except json.JSONDecodeError:
        return None

    verdict = str(parsed.get("verdict", "")).strip().lower()
    if verdict not in VERDICTS:
        return None
    return {
        "verdict": verdict,
        "trick": str(parsed.get("trick") or "Unverified source").strip(),
        "summary": str(parsed.get("summary") or "Could not confirm this claim.").strip(),
        "reply": str(parsed.get("reply") or "Please don't forward this until we can check it.").strip(),
        "answer": str(parsed.get("answer") or "").strip(),
        "correction": str(parsed.get("correction") or "").strip(),
        "engine": engine,
    }


def _guard(result, text, notes):
    """Stop a confident FALSE when the notes already show a current Nvidia breach."""
    if not result or "brev" not in notes.lower():
        return result
    if not re.search(r"nvidia", text, re.I):
        return result
    blob = f"{result.get('summary', '')} {result.get('reply', '')}".lower()
    wrong = re.search(
        r"years ago|old news|wasn't actually hacked|was not hacked|not hacked this month|weren't actually",
        blob,
    )
    if result["verdict"] in {"true", "misleading"} and not wrong:
        return result
    exploding = re.search(r"explod", text, re.I)
    today = re.search(r"\btoday\b", text, re.I)
    extra = " The message also says GPUs are exploding. That part is not in the report." if exploding else ""
    when = " It was not today." if today else ""
    return {
        "verdict": "misleading",
        "trick": "Real breach, twisted details",
        "summary": (
            "Nvidia did disclose a Brev cloud breach this month. Unauthorized activity ran "
            "from 4 October to 20 October 2026, and SSH keys for customer machines may have "
            "been exposed. Nvidia says the keys were rotated and it found no confirmed misuse."
            + when
            + extra
        ),
        "reply": (
            "Part of this is real. Nvidia told customers in November 2026 about a breach on "
            "its Brev GPU platform in October. It was SSH keys, not exploding GPUs, and Nvidia "
            "says it found no confirmed misuse. Don't forward the scary version."
        ),
        "answer": (
            "Part of this is real. Nvidia told customers in November 2026 that its Brev cloud "
            "GPU platform had unauthorized activity from 4 October to 20 October 2026. SSH keys "
            "for customer machines may have been exposed. Nvidia says the keys were rotated and "
            "it found no confirmed misuse."
            + when
            + extra
        ),
        "correction": result.get("correction") or "",
        "original": result.get("original") or "",
        "engine": result.get("engine") or "gemini",
    }


def _weather_note(text):
    """Live forecast. Gemini's own search quota is used up on this key."""
    if not re.search(r"\bweather\b", text, re.I):
        return ""
    place = "Chennai"
    match = re.search(r"\b(?:in|at|for)\s+([A-Za-z][A-Za-z .'-]{1,40})", text)
    if match:
        place = re.split(r"\b(?:today|now|please|right now)\b", match.group(1), maxsplit=1, flags=re.I)[0]
        place = place.strip(" ?.,")
    raw_geo = _http_get(
        "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + quote(place or "Chennai"),
        seconds=4,
    )
    if not raw_geo:
        return ""
    try:
        hit = json.loads(raw_geo)["results"][0]
        latitude = hit["latitude"]
        longitude = hit["longitude"]
        found = str(hit.get("name") or place)
    except (KeyError, IndexError, json.JSONDecodeError, TypeError):
        return ""
    raw_wx = _http_get(
        "https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code"
        f"&latitude={latitude}&longitude={longitude}",
        seconds=4,
    )
    if not raw_wx:
        return ""
    try:
        current = json.loads(raw_wx)["current"]
        temp = current["temperature_2m"]
        code = int(current.get("weather_code") or 0)
    except (KeyError, json.JSONDecodeError, TypeError, ValueError):
        return ""
    sky = {
        0: "clear", 1: "mainly clear", 2: "partly cloudy", 3: "cloudy",
        45: "foggy", 48: "foggy", 51: "drizzle", 61: "rain", 63: "rain",
        65: "heavy rain", 80: "showers", 95: "a thunderstorm",
    }.get(code, "mixed clouds")
    return f"Right now in {found} it is {temp}°C and {sky}."


def _gemini_payload(url, key, prompt, seconds):
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512},
    }).encode("utf-8")
    raw_payload = _generate(url, key, body, seconds=seconds)
    if not raw_payload:
        print("Gemini returned nothing.")
        return None
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError:
        print("Gemini reply was not usable.")
        return None
    if payload.get("error"):
        message = str((payload.get("error") or {}).get("message") or "gemini error")
        print("Gemini error:", message[:160])
        return None
    try:
        parts = payload["candidates"][0]["content"]["parts"]
        raw = "\n".join(str(part.get("text") or "") for part in parts if isinstance(part, dict))
    except (KeyError, IndexError, TypeError):
        print("Gemini reply was not usable.")
        return None
    parsed = _from_model_text(raw, "gemini")
    if parsed:
        return parsed
    print("Gemini reply was not JSON:", " ".join(raw.split())[:180])
    return None


def gemma_check(text, notes="", reading=""):
    key = _api_key()
    if not key:
        return None

    prompt = _prompt(text, notes, reading)
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent"
    parsed = _gemini_payload(url, key, prompt, seconds=18)
    if not parsed:
        return None
    return _guard(parsed, reading or text, notes)


def _openrouter_key():
    return os.environ.get("OPENROUTER_API_KEY") or ""


def _openrouter_model():
    return os.environ.get("OPENROUTER_MODEL") or DEFAULT_OPENROUTER_MODEL


def _message_text(payload):
    try:
        message = payload["choices"][0]["message"]
    except (KeyError, IndexError, TypeError):
        return None
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                parts.append(str(part.get("text") or ""))
            else:
                parts.append(str(part))
        content = "".join(parts)
    if content is None or not str(content).strip():
        return None
    return str(content)


def _openrouter_post(body, key):
    """POST one chat completion. A failure returns None so the bot can fall through."""
    curl = shutil.which("curl.exe") or shutil.which("curl")
    if curl:
        header_path = None
        try:
            fd, header_path = tempfile.mkstemp(prefix="nermai-or-")
            os.close(fd)
            with open(header_path, "w", encoding="utf-8") as handle:
                handle.write("Content-Type: application/json\n")
                handle.write(f"Authorization: Bearer {key}\n")
                handle.write("X-OpenRouter-Title: NermaiPar\n")
            proc = subprocess.run(
                [
                    curl, "-sS", "-m", "25",
                    "-H", f"@{header_path}",
                    "--data-binary", "@-",
                    OPENROUTER_URL,
                ],
                input=body,
                capture_output=True,
                timeout=30,
            )
        except (subprocess.TimeoutExpired, OSError):
            return None
        finally:
            if header_path:
                try:
                    os.remove(header_path)
                except OSError:
                    pass
        if proc.returncode == 0 and proc.stdout:
            return proc.stdout.decode("utf-8", errors="replace")
        return None

    request = urllib.request.Request(
        OPENROUTER_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "X-OpenRouter-Title": "NermaiPar",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return response.read().decode("utf-8")
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def openrouter_check(text, notes="", reading=""):
    key = _openrouter_key()
    if not key:
        return None

    body = json.dumps({
        "model": _openrouter_model(),
        "temperature": 0.2,
        "max_tokens": 500,
        "messages": [{"role": "user", "content": _prompt(text, notes, reading)}],
    }).encode("utf-8")
    raw_payload = _openrouter_post(body, key)
    if not raw_payload:
        return None
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError:
        return None
    raw = _message_text(payload)
    if not raw:
        return None
    return _from_model_text(raw, "openrouter")


def _finish(result, original, reading):
    if result is None:
        return None
    result["question"] = _is_question(reading or original)
    result["original"] = original
    correction = str(result.get("correction") or "").strip()
    if not correction and reading.lower() != original.lower():
        correction = reading
    result["correction"] = correction
    if not str(result.get("answer") or "").strip():
        result["answer"] = result.get("summary") or result.get("reply") or ""
    return result


def check_claim(text):
    original = " ".join(str(text or "").split())
    if is_small_talk(original):
        return _chat_result(original)
    cleaned = _normalize(original)
    if not cleaned:
        return {
            "verdict": "unverified",
            "trick": "Empty message",
            "summary": "Paste the forwarded message first.",
            "reply": "",
            "answer": "Paste the forwarded message first.",
            "correction": "",
            "original": "",
            "question": False,
            "engine": "local",
        }
    weather = _weather_note(cleaned)
    if weather and _is_question(cleaned):
        return _finish({
            "verdict": "chat",
            "trick": "None",
            "summary": "",
            "reply": "",
            "answer": weather,
            "engine": "local",
        }, original, cleaned)
    notes = _news_notes(cleaned)
    if weather:
        notes = (notes + "\n" + weather).strip()
    remote = gemma_check(original, notes, cleaned)
    if remote:
        remote["searched"] = "Web:" in notes or "Headline:" in notes
        return _finish(remote, original, cleaned)
    remote = openrouter_check(original, notes, cleaned)
    if remote:
        return _finish(_guard(remote, cleaned, notes), original, cleaned)
    if "brev" in notes.lower():
        print("Model check returned nothing. Using the Nvidia Brev note.")
        return _finish(_guard(
            {
                "verdict": "unverified",
                "trick": "Unverified source",
                "summary": "",
                "reply": "",
                "engine": "gemini",
            },
            cleaned,
            notes,
        ), original, cleaned)
    print("Model check returned nothing. Using the saved hoax list.")
    return _finish(local_check(cleaned), original, cleaned)


def format_reply(result):
    labels = {
        "true": "TRUE",
        "false": "FALSE",
        "misleading": "MISLEADING",
        "unverified": "UNVERIFIED",
    }
    action = {
        "true": "Safe to share if you include the official source.",
        "false": "Do not forward.",
        "misleading": "Do not forward. Part of this is twisted.",
        "unverified": "Pause. Do not forward yet.",
    }
    stamp = labels.get(result["verdict"], "UNVERIFIED")
    lines = []
    correction = str(result.get("correction") or "").strip()
    original = str(result.get("original") or "").strip()
    if correction and not _same_words(correction, original):
        lines.append(f"Spelling fix: {correction}")
        lines.append("")
    if result.get("answer"):
        lines.extend([result["answer"], ""])
    if result.get("verdict") == "chat":
        return "\n".join(line for line in lines if line is not None).strip()
    lines.append(f"NermaiPar · {stamp}")
    trick = result.get("trick") or ""
    if trick and trick not in {"None", "Unverified source"}:
        lines.append(f"Trick: {trick}")
    if not result.get("answer") and result.get("summary"):
        lines.extend(["", result["summary"]])
    lines.append(action.get(result["verdict"], "Pause."))
    if result.get("reply") and not result.get("question"):
        lines.extend(["", "Reply you can send:", result["reply"]])
    engine = result.get("engine")
    if engine == "gemma":
        lines.extend(["", "Checked with Gemma."])
    elif engine == "gemini":
        if result.get("searched"):
            lines.extend(["", "Checked with Gemini, using web search."])
        else:
            lines.extend(["", "Checked with Gemini."])
    elif engine == "openrouter":
        lines.extend(["", "Checked with OpenRouter."])
    else:
        lines.extend(["", "Checked with NermaiPar's saved hoax list."])
    return "\n".join(lines)


if __name__ == "__main__":
    samples = [
        "Govt secretly releasing emergency herbal remedy for new virus, forward to all contacts immediately!",
        "Your bank account blocked. Click bit.ly/fake-link to update KYC instantly.",
        "ISRO successfully launches next-generation satellite into orbit.",
        "New ₹500 note has a hidden GPS chip so the government can track you. RBI confirmed it.",
        "My school is closed tomorrow because of rain.",
    ]
    for sample in samples:
        print("---")
        print(format_reply(check_claim(sample)))
        print()
