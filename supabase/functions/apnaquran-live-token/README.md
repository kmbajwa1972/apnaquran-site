# ApnaQuran Gemini Live prototype

This branch adds a real-time two-way voice mode to the ApnaQuran assistant while preserving the existing text assistant as a fallback.

## Security and deployment

- The Live token function is separate from `apnaquran-assistant`; the existing text endpoint is not replaced.
- The function mints a short-lived, single-use Gemini Live token using the Supabase secret `GEMINI_LIVE_API_KEY`. The permanent API key is never sent to browser code.
- Supabase JWT verification remains enabled (`verify_jwt: true`).
- Browser origins are restricted to ApnaQuran and local development.
- The token is restricted to the Live model and audio response configuration.
- The function is deployed to the existing Supabase project as `apnaquran-live-token`. The website's GitHub feature branch is still separate from `main`; the live site will not show the assistant until the website change is merged and published.
- No new Supabase project was created. Gemini model access/quota is not yet confirmed until a real browser session succeeds.

## Browser voice flow

1. The browser requests a short-lived token from `/functions/v1/apnaquran-live-token`.
2. The browser opens the Gemini Live constrained WebSocket using that token.
3. Microphone audio is downsampled to 16 kHz PCM and streamed to Gemini.
4. Gemini audio is played as 24 kHz PCM; input/output transcriptions are shown in the assistant panel.
5. Tap the microphone button again to stop the session. Typed questions continue to use the existing text assistant.

The browser requests microphone access only after the visitor taps the microphone. The site must be loaded over HTTPS (or localhost for development). Browser support and Google's model/quota access can affect whether a session starts.

## Required secret

Set `GEMINI_LIVE_API_KEY` in Supabase Edge Function Secrets. This is separate from `GEMINI_API_KEY`. Never place either permanent key in HTML or browser JavaScript.

## Official references

- https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- https://ai.google.dev/gemini-api/docs/live-api/thinking
- https://ai.google.dev/api/live
