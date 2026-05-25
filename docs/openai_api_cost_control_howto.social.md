# Social posts — How to stop the OpenAI API from eating your wallet

## Twitter / X (max 280 chars)

Your OpenAI bill is optional. Four levers, all wrapping the same OpenAI client: run local (free), swap in Gemini, cache repeats in sqlite, log per-bucket spend. Same app code, different fetch wiring. github.com/jeromeetienne/openai_api_local

---

## Bluesky (max 300 chars)

Your OpenAI bill is optional. Four levers, all wrapping the same OpenAI client: run local (LM Studio/Ollama, free), switch to Gemini, cache identical calls in a local sqlite file, log per-bucket spend. Same code, different fetch wiring. github.com/jeromeetienne/openai_api_local

---

## LinkedIn (800–1500 chars, multi-paragraph)

Your OpenAI bill is a configuration choice, not a fixed cost.

The same HTTP protocol that makes the bill possible also makes the bill optional. Everything that speaks OpenAI's wire format — the official SDK, the Agents JS SDK, plain chat completions — accepts the same cost-control tricks.

Four levers, in roughly increasing cost:

- Run the model locally. LM Studio or Ollama, no API key, no network, no bill. Perfect for the iteration loop where you rerun the same prompt forty times.
- Use a cheaper hosted provider. Gemini speaks the OpenAI protocol at Gemini prices — a baseURL and apiKey change, nothing else.
- Cache hosted calls. openai-cache content-addresses requests into sqlite at the fetch layer. Same prompt → free, instant, served from a file in outputs/.
- Track what you didn't avoid. openai-cost logs every call with a bucket id, so you can see per-feature, per-script, per-experiment spend whenever you ask for it.

They all attach to the same OpenAI client. Cost tracker wraps cache wraps global fetch — wire once, everything downstream benefits. The repo's openai_chat_full.ts runs the full 4 providers × 4 wrapper-combo matrix in one shot so you can watch the latency drop off a cliff on the second pass.

Pick the cheapest lever that meets your quality bar. Stack them when it helps. Watch your token bill not move.

github.com/jeromeetienne/openai_api_local

#TypeScript #OpenAI #LLMOps #DevTools #AIInfra
