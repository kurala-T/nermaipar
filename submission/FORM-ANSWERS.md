# VerseHack 2026 Round 2 — paste these into the form

Form: https://forms.gle/3K9J2X8XCiQ6Yv3f8

Deadline: Sunday 15 November 2026, 11:59 PM IST. You get one submission. Do not send the form until the four links below all open.

Rules: https://docs.google.com/document/d/1L6cGlxG02d7NkyIoQVzZHStVTcG2sMXyUPBl1fDkeok/edit

New rule from the organisers on 12 November 2026: the prototype and the demo video must be entirely in English. That includes on-screen text, buttons, narration, and explanations.

## Links still to fill in tomorrow

- Prototype link: not public yet. Deploy the site, test it in a private window, then paste that URL.
- GitHub: https://github.com/kurala-T/nermaipar
- Demo video: record from `VIDEO-SCRIPT.md`, upload to Drive or YouTube, then paste the link. Drive must be "Anyone with the link". YouTube must be Public or Unlisted.
- PDF: upload `submission/NermaiPar-Round2.pdf` to Drive, same sharing setting, and paste that link. The form asks for a Drive link, not the file itself.

## A. Technologies and tools

NermaiPar is a static web prototype plus a Python Telegram bot. The site is HTML, CSS, and JavaScript, with a web app manifest and a service worker so it can be installed and opened offline. The bot is Python 3.11. It calls the Gemini API for verdicts and uses a live news search before each check. Weather questions use the Open-Meteo forecast. There is an optional OpenRouter fallback if a key is added. No paid hosting is required to run the site locally.

## B. Key features

The bot takes a forwarded message or a question and replies in a normal sentence, then stamps it True, False, Misleading, or Unverified. It fixes common spelling mistakes, reacts with an emoji, and gives a short reply a person can paste back to a family group. It searches current headlines before judging a claim, and it answers a weather question from a live forecast instead of treating it as a hoax. The website shows the wider flow: Detect the claim, Explain the trick, Respond without a fight, and Train with a short quiz. WhatsApp and SMS on the site are walkthroughs of those channels. The live checker is the Telegram bot.

## C. How it works

A person sends a message to the Telegram bot. The bot ignores greetings and messages about how to use it, so those are not stamped as hoaxes. For a real claim, it normalises obvious typos, fetches a few current news headlines, and sends the message plus those notes to Gemini. Gemini returns a verdict, a spoken answer, the trick, and a paste-back reply. The bot shows "Checking…", then edits that message into the final answer and adds a reaction. If Gemini returns nothing, a small local list still catches known health scams, KYC phishing, and the fake GPS-chip note. The website runs the same four-step idea in the browser so a judge can click through Detect, Explain, Respond, and Train without an account.

## D. Limits and what comes next

The bot can be wrong, and a headline search can miss the exact story. Gemini's own Google Search tool is over the free quota, so search goes through a news feed instead. WhatsApp and SMS are not connected to real networks yet. The Discord bot is built but not the public demo. Next we would add WhatsApp, keep a cited source link on every verdict, and cache the most common hoaxes for slow connections.

## Before you press Submit

- Open the prototype link in a private window. Click Health scam, then Analyze.
- Open the GitHub link while logged out. The README should load. No token should be visible.
- Play the first 20 seconds of the video from another account or a private window.
- Open the PDF link and confirm it is the NermaiPar document, not a request for access.
- Read the video once more and check that every spoken line and every on-screen word is English.
