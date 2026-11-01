# ApnaQuran Brevo subscription Worker

This Worker serves only `/api/subscribe` on `apnaquran.com` and `www.apnaquran.com`.
It is separate from the `apnaquran-publisher` Pages project, which publishes Quran verses to social media.

## Cloudflare deployment

Create a Worker connected to this repository and set its root directory to:

`workers/apnaquran-subscribe`

Cloudflare should detect `wrangler.jsonc` and use `src/index.js` as the entry point.

In the Worker's **Production** variables and secrets, add:
- Secret: `BREVO_API_KEY` (the Brevo API key; never commit it)
- Text variable: `BREVO_DOI_TEMPLATE_ID` = `1`

The Wrangler configuration attaches only the two exact subscription endpoint routes. It does not route the rest of the website or publisher traffic through this Worker.

## Behavior

- Accepts POST JSON with `email` and optional honeypot `website`.
- Requests Brevo double opt-in for list ID 3 using template ID 1.
- Does not expose Brevo response details or API credentials to visitors.
