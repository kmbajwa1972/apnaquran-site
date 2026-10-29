# ApnaQuran Gemini assistant setup

The browser widget calls the Supabase Edge Function `apnaquran-assistant`. The function calls the Gemini API server-side so the Gemini key is never exposed to visitors.

## One-time secret setup

The function has been deployed to the existing Supabase project **glimerz-reviews** because the account currently has two active projects and is on the Free plan. This adds a separate function only; it does not edit or replace any existing function or database table.

1. Open the [Supabase dashboard](https://supabase.com/dashboard/project/yayljmqelmsmcsuhxqdj/functions/secrets).
2. Open **Edge Functions → Secrets** (the label may appear as **Manage secrets**).
3. Add a secret named `GEMINI_API_KEY` and paste the key created in Google AI Studio. Do not put the key in GitHub or website JavaScript.
4. Save it. Do not enable Google Cloud billing; use only the AI Studio project's Free tier.
5. After the secret is saved, test the function with one short question and check its logs for errors.

## Model and safety

- Model ID: `gemini-3.8-flash`
- The function limits a question to 1,200 characters, limits conversational history and output length, and returns a friendly error for provider rate limits.
- It instructs the model not to invent Quran quotations, ayah references, hadith wording, or scholarly rulings. This is a precaution, not a substitute for source retrieval and verification.
- Browser speech input and text-to-speech depend on browser support and permissions.
- The Supabase public anon key used by the website is intended for client-side use; the Gemini key is secret.

## Deployment status

The UI and function code are on the feature branch and in draft PR #3. The function is deployed but cannot generate answers until `GEMINI_API_KEY` is saved in Supabase. Do not merge the website branch until the secret is set and the function is tested.


## Public endpoint authentication

The `apnaquran-assistant` widget is called by visitors without signing in, so `supabase/config.toml` sets `verify_jwt = false` for this function. Do not send the public anon key as a Bearer token; send it only in the `apikey` header. The function must retain its origin allowlist, input limits, and server-side request throttling. Keep `GEMINI_API_KEY` server-side only.
