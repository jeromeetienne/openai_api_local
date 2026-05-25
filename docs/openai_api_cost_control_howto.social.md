# Social posts — How to control the cost of the OpenAI API

## Twitter / X (max 280 chars)

Four levers for OpenAI cost control, all on one client: run local (LM Studio/Ollama), use cheaper Gemini, cache identical calls in sqlite (openai-cache), track per-bucket spend (openai-cost). Compose at the fetch layer.

github.com/jeromeetienne/openai_api_local

---

## Bluesky (max 300 chars)

Four OpenAI cost-control levers, all on the same client: run locally (LM Studio/Ollama, free), use a cheaper provider (Gemini), cache identical requests in sqlite (openai-cache), track per-bucket spend (openai-cost). All compose at the fetch layer.

github.com/jeromeetienne/openai_api_local

---

## LinkedIn (800–1500 chars, multi-paragraph)

Using the OpenAI API is great until the bill arrives. The good news: everything that speaks the OpenAI HTTP protocol — official API, Agents JS SDK, plain chat.completions — also accepts the same cost-control wrappers. You don't rewrite the app; you wrap the OpenAI client.

Four levers, in roughly increasing cost:

- Run the model locally with LM Studio or Ollama. No key, no network, no bill. Cheapest possible inference: free.
- Use a cheaper hosted provider. Gemini's OpenAI-compatible endpoint speaks the same protocol and bills at a different rate — change baseURL and apiKey, nothing else.
- Cache hosted calls with openai-cache. Content-addressed sqlite cache at the fetch layer; identical requests return in milliseconds. Sqlite-backed means zero infrastructure — just a file in outputs/.
- Track what you spent with openai-cost. Every paid call is recorded into sqlite with a bucket id (per feature, per script, per eval suite). At the end, getSummaryCosts() tells you exactly what each bucket cost.

They compose: cost tracker wraps cache wraps fetch. The cost tracker sees every call; the cache may have already short-circuited the network. Useful for budgeting an eval before you uncache it and actually pay.

Pick the cheapest lever that meets your quality bar. Stack them when it helps.

Full guide and a runnable matrix runner (4 providers × 4 wrapper combos = 16 cells):
https://github.com/jeromeetienne/openai_api_local

#TypeScript #OpenAI #LLMOps #CostOptimization #DevTools
