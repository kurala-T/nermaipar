"""Telegram bot. Free. Needs a token from @BotFather."""

import json
import shutil
import subprocess
import time
import urllib.error
import urllib.request

from check import check_claim, format_reply, is_small_talk

START = """NermaiPar is on.

Forward me a suspicious message from WhatsApp, Discord, Telegram, or SMS.

Or ask a question, like "Did Nvidia get hacked this month?"

I will fix spelling, answer in a normal sentence, react to your message, then say True, False, Misleading, or Unverified.

Do not send real OTPs, passwords, or bank PINs."""


def _call(token, method, payload):
    """curl uses Windows TLS. Python's own SSL handshake is slow on this PC."""
    body = json.dumps(payload).encode("utf-8")
    curl = shutil.which("curl.exe") or shutil.which("curl")
    url = f"https://api.telegram.org/bot{token}/{method}"
    limit = 35 if method == "getUpdates" else 12
    if not curl:
        request = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(request, timeout=limit) as response:
            return json.loads(response.read().decode("utf-8"))
    proc = subprocess.run(
        [curl, "-sS", "-m", str(limit), "-H", "Content-Type: application/json", "--data-binary", "@-", url],
        input=body,
        capture_output=True,
        timeout=limit + 5,
    )
    if proc.returncode != 0 or not proc.stdout:
        detail = proc.stderr.decode("utf-8", errors="replace")[:180]
        raise urllib.error.URLError(detail or "telegram call failed")
    data = json.loads(proc.stdout.decode("utf-8"))
    if not data.get("ok"):
        raise urllib.error.URLError(str(data.get("description") or "telegram rejected the call")[:180])
    return data


REACTIONS = {
    "true": "👍",
    "false": "👎",
    "misleading": "🤔",
    "unverified": "👀",
    "chat": "👋",
}


def _react(token, chat_id, message_id, emoji):
    if chat_id is None or message_id is None:
        return
    try:
        _call(token, "setMessageReaction", {
            "chat_id": chat_id,
            "message_id": message_id,
            "reaction": [{"type": "emoji", "emoji": emoji}],
        })
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"Reaction skipped: {error}")


def _answer(text):
    cleaned = (text or "").strip()
    if cleaned.lower() in {"/start", "/help"}:
        return START, None
    if cleaned.lower().startswith("/check"):
        cleaned = cleaned.split(" ", 1)[1] if " " in cleaned else ""
    if not cleaned:
        return "Paste the forwarded message after this.", None
    result = check_claim(cleaned)
    return format_reply(result), REACTIONS.get(result.get("verdict"), "👀")


def run(token):
    offset = None
    print("Telegram bot is running. Open your bot in Telegram and send a message.")
    print("Leave this window open. Ctrl+C stops it.")
    while True:
        try:
            payload = {"timeout": 25}
            if offset is not None:
                payload["offset"] = offset
            data = _call(token, "getUpdates", payload)
            for update in data.get("result", []):
                offset = update["update_id"] + 1
                message = update.get("message") or update.get("edited_message") or {}
                chat = message.get("chat") or {}
                chat_id = chat.get("id")
                text = message.get("text") or message.get("caption") or ""
                if chat_id is None or not text:
                    continue
                message_id = message.get("message_id")
                quick = (
                    text.strip().lower() in {"/start", "/help"}
                    or text.strip().lower() == "/check"
                    or is_small_talk(text)
                )
                if quick:
                    reply, reaction = _answer(text)
                    _call(token, "sendMessage", {
                        "chat_id": chat_id,
                        "text": reply[:4000],
                        "reply_to_message_id": message_id,
                    })
                    continue
                pending = _call(token, "sendMessage", {
                    "chat_id": chat_id,
                    "text": "Checking…",
                    "reply_to_message_id": message_id,
                })
                reply, reaction = _answer(text)
                sent_id = (pending.get("result") or {}).get("message_id")
                if sent_id is None:
                    continue
                _call(token, "editMessageText", {
                    "chat_id": chat_id,
                    "message_id": sent_id,
                    "text": reply[:4000],
                })
                if reaction:
                    _react(token, chat_id, message_id, reaction)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:180]
            print(f"Telegram call failed: {detail}")
            time.sleep(3)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, subprocess.TimeoutExpired) as error:
            print(f"Network hiccup: {error}")
            time.sleep(2)
