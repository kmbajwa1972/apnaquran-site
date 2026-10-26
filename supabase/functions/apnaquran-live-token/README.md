# ApnaQuran Gemini Live prototype

This is an isolated prototype for a real-time, two-way spoken assistant using Google's `gemini-3.8-live-extended-thinking` Live API.

## Safety and deployment notes

- This function is intentionally separate from `apnaquran-assistant`; it does not replace or modify the existing text-generation function.
- It requests a short-lived, single-use Gemini Live token. The permanent `GEMINI_API_KEY` remains in Supabase Edge Function Secrets and is never returned to the browser.
- The endpoint expects the normal Supabase JWT/Authorization header (`verify_jwt: true`).
- Browser origins are restricted to ApnaQuran and local development.
- The token is constrained to the Live model, audio responses, audio transcription, a short session lifetime, and a conservative LOW thinking level for initial tests.
- Do not deploy this function or connect it to the live site until the PR is reviewed and the token endpoint has been tested in the existing Supabase project.
- Gemini Live is a separate WebSocket protocol; it cannot be enabled by simply changing the model name in the existing `generateContent` function.

## Expected browser flow

1. Request a token from `/functions/v1/apnaquran-live-token` using the Supabase project URL, publishable/anon key, and user-facing authorization header.
2. Connect to Google's Gemini Live WebSocket using the returned short-lived token and the constrained Live endpoint.
3. Send microphone audio frames and handle incoming audio, input/output transcription, errors, and session lifecycle messages.
4. For the extended-thinking model, keep listening until `interactionStatus` becomes `IDLE`; `turnComplete` alone does not guarantee the interaction is finished.

## Required secret

Set `GEMINI_LIVE_API_KEY` in Supabase Edge Function Secrets. This is a separate secret from `GEMINI_API_KEY`, so testing the Live prototype will not require replacing the existing assistant's key. Never put it in HTML or browser JavaScript.

## Reference

Google's official documentation:
- https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- https://ai.google.dev/gemini-api/docs/live-api/thinking
- https://ai.google.dev/api/live
