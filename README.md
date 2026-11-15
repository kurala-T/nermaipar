# NermaiPar

**An omnipresent circuit breaker for digital misinformation.**  
Built by **Team Nermai TOPpers** (Tejas, Oviyan, Prithish) for **VerseHack 2026 — Round 2**.

---

## Live Bots (Prototype)
- **Telegram Bot:** [@Nermaiparbot](https://t.me/Nermaiparbot)
- **Discord Bot:** [Invite @Nerman to Your Server](https://discord.com/oauth2/authorize?client_id=1567186483947905044&permissions=68608&scope=bot)

---

## What NermaiPar Does
NermaiPar sits directly inside the messaging apps people already use—so you never have to leave a chat to check a suspicious forward.

- **Four Honest Verdicts:** Classifies claims as **True**, **False**, **Misleading**, or **Unverified** in under 10 seconds.
- **Auto-Typo Cleanup & Intent Routing:** Normalizes broken forwarded spelling (e.g., *"baning"* → *"banning"*) and answers casual greetings/questions conversationally without stamping them as hoaxes.
- **Live News Grounding:** Queries current news headlines before evaluating breaking claims.
- **Conflict-Free Replies:** Drafts polite, ready-to-paste responses so students can correct family elders without starting an argument.

---

## Tech Stack & Model Roadmap
- **Core Engine:** Python 3.11 (`bot/run.py`, `bot/check.py`) powering Telegram (`curl` fast polling) and Discord (`discord.py`).
- **Prototype AI:** Google Gemini API (`gemini-2.5-flash-lite`) with live Google News RSS grounding, OpenRouter (`google/gemma-4-31b-it:free`) fallback, and a local verified hoax list.
- **Future Production Roadmap:** Custom-trained open-source **Google Gemma** model dedicated to deception detection (zero third-party API dependence, full chat privacy, on-device inference), Top-500 offline vector cache, and a `<140-byte` 2G SMS protocol.

---

## Run Locally
1. Clone the repo and install dependencies:
   ```bash
   pip install -r bot/requirements.txt
