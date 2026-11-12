"""Start NermaiPar.

  python bot/run.py          uses a token if you have one, otherwise a local demo
  python bot/run.py demo
  python bot/run.py telegram
  python bot/run.py discord
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "bot") not in sys.path:
    sys.path.insert(0, str(ROOT / "bot"))

from check import check_claim, format_reply  # noqa: E402


def load_env():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def demo():
    print("NermaiPar local demo. No token needed.")
    print("Paste a forward and press Enter. Type quit to stop.")
    print()
    while True:
        try:
            text = input("Forward> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if text.lower() in {"quit", "exit"}:
            return
        print()
        print(format_reply(check_claim(text)))
        print()


def main():
    load_env()
    mode = (sys.argv[1] if len(sys.argv) > 1 else "auto").lower()
    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    discord_token = os.environ.get("DISCORD_BOT_TOKEN", "")

    if mode == "demo":
        demo()
        return
    if mode == "telegram":
        if not telegram_token:
            print("Add TELEGRAM_BOT_TOKEN to the .env file, then run this again.")
            return
        from telegram_bot import run
        run(telegram_token)
        return
    if mode == "discord":
        if not discord_token:
            print("Add DISCORD_BOT_TOKEN to the .env file, then run this again.")
            return
        from discord_bot import run
        run(discord_token)
        return

    if telegram_token:
        from telegram_bot import run
        run(telegram_token)
        return
    if discord_token:
        from discord_bot import run
        run(discord_token)
        return

    print("No bot token yet, so this is the local demo.")
    print("Telegram: message @BotFather, send /newbot, put the token in .env")
    print("Discord: make a bot at discord.com/developers, turn on Message Content, put the token in .env")
    print("Gemma: free key from aistudio.google.com/apikey as GEMINI_API_KEY")
    print("OpenRouter fallback: key from openrouter.ai/keys as OPENROUTER_API_KEY")
    print()
    demo()


if __name__ == "__main__":
    main()
