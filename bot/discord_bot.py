"""Discord bot. Free. Needs a bot token and the Message Content intent."""

import asyncio

from check import check_claim, format_reply


def run(token):
    try:
        import discord
    except ImportError:
        print("Discord library is missing. Run: python -m pip install -r bot/requirements.txt")
        return

    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f"Discord bot is running as {client.user}. Mention it or DM it.")

    @client.event
    async def on_message(message):
        if message.author.bot:
            return
        mentioned = client.user in message.mentions if client.user else False
        is_dm = message.guild is None
        if not mentioned and not is_dm:
            return
        text = message.content
        if client.user:
            text = text.replace(f"<@{client.user.id}>", " ").replace(f"<@!{client.user.id}>", " ")
        text = text.strip()
        if text.lower() in {"", "help", "/help"}:
            reply = "Paste a suspicious forward. I will reply with True, False, Misleading, or Unverified."
        else:
            reply = format_reply(check_claim(text))
        await message.channel.send(reply[:1900])

    asyncio.run(client.start(token))
