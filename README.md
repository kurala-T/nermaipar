# NermaiPar

> An omnipresent circuit breaker for digital misinformation.

NermaiPar is a mobile-first web prototype built for **VerseHack 2026**. It helps a person pause a suspicious forward, see the manipulation tactics inside it, reply without starting a fight, and train their eye for the next one.

The prototype covers three delivery channels:

- **Mobile app** — the full Detect → Explain → Respond → Train flow
- **WhatsApp bot** — forward a message and get a verdict plus a polite reply
- **SMS / feature phone** — a simulated 2G phone that replies on 56161

## Live checker

The Telegram bot is the working fact-checker. From this folder, with a `.env` file based on `.env.example`:

```powershell
python bot/run.py telegram
```

Send a forward or a question to the bot. It replies with a sentence and a stamp: True, False, Misleading, or Unverified. Do not commit `.env`. It holds the bot token and the Gemini key.

The website below is the full Detect, Explain, Respond, and Train walkthrough. Its WhatsApp and SMS screens are demonstrations, not live networks.

## Run the website

No build step is required. From this folder:

```powershell
python -m http.server 4173
```

Then open <http://127.0.0.1:4173>.

You can also open `index.html` directly, but serving it over HTTP gives clipboard, downloads and browser permissions a better chance of working.

The first load uses CDN copies of Tailwind CSS, Lucide icons, and Google Fonts, so an internet connection is needed for the full visual treatment. After the first visit, the service worker caches the app shell, so a reload still opens when the network drops.

### Install as an app

NermaiPar ships a web app manifest and a service worker, so it can be installed like a native app:

- **Chrome / Edge (desktop)**: open the page, then use the install icon in the address bar or **Menu → Cast, save and share → Install page as app**.
- **Android Chrome**: **⋮ → Add to Home screen → Install**.
- **iOS Safari**: **Share → Add to Home Screen**.

Installed, it opens standalone without browser chrome and keeps working offline for the cached shell.

## What to try

1. Pick a sample claim: **Health scam**, **KYC fraud**, or **ISRO real news**.
2. Press **Analyze claim**.
3. Open **Explain** and tap a highlighted phrase or a red-flag chip.
4. Open **Respond**, switch the tone between elder / peer / firm, then copy the script or download the 1080×1080 fact-card.
5. Open **Train**, finish the five-question adaptive round, and check the weak-spot profile.
6. Switch to **WhatsApp bot** and forward the health sample.
7. Switch to **SMS / feature phone**, tap a sample, then press **1**, **2** or **3** on the keypad.
8. Open **Judge mode** to demonstrate the architecture, SHA-256 fingerprint, offline queue, and live mutation stream. Toggle **Go offline** and analyze a claim to see it buffered locally.

## Implementation notes

- **Static prototype**: all analysis, WhatsApp, SMS, and network behaviour is simulated locally. No message leaves the browser.
- **Claim grouping**: text is fingerprinted with SHA-256 via `crypto.subtle`, with a deterministic fallback for non-secure contexts.
- **Offline buffer**: switching to offline mode queues checks in memory; going back online flushes them and writes a `sync.flush` mutation to the telemetry drawer.
- **Learning profile**: quiz answers update XP, accuracy, tactic-level weak spots, and round counts in `localStorage`.
- **Fact card**: rendered in the DOM and exported as a PNG with the Canvas API.
- **Offline shell**: `sw.js` precaches the local HTML, JS, styles, and icons; navigations are network-first with a cached fallback, and CDN assets use stale-while-revalidate.
- **Installable**: `manifest.webmanifest` declares standalone display, theme colours, 192/512/maskable icons, and Detect/Train shortcuts.
- **Languages**: English, Hindi, and Tamil UI strings live in `i18n.en.js`, `i18n.hi.js`, and `i18n.ta.js`.

To start with a fresh learner profile, clear the `nermaipar_stats_v1` and `nermaipar_lang` keys for the site in DevTools → Application → Local storage.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | All three channel views, sidebar, and judge drawer |
| `app.js` | App state, analysis, quiz, threads, WhatsApp, SMS, telemetry |
| `data.js` | Claims, tactic descriptions, thread order, quiz bank |
| `i18n.*.js` | Localized interface strings |
| `manifest.webmanifest` | PWA name, colours, icons, and shortcuts |
| `sw.js` | Offline app-shell cache |
| `icons/` | App icons (192, 512, maskable 1024, favicon, Apple touch) |
| `README.md` | This file |

## Production direction

For a real deployment, keep the interaction model but move the demo seams to a backend:

- Convex realtime queries and mutations for claims, threads, and community checks
- A fact-check retrieval layer with source citations and confidence scoring
- A WhatsApp Cloud API webhook and an SMS gateway short code
- Whisper-compatible voice transcription and OCR for screenshots
- A cached top-hoax set for offline and low-bandwidth use

This is a prototype. Always confirm with official sources before acting on a claim.
