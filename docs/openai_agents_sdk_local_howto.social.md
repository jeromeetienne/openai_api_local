# Social posts — How to run the OpenAI Agents JS SDK against local models

## Twitter / X (max 280 chars)

The OpenAI Agents JS SDK works against local models — LM Studio, Ollama, Gemini. The one gotcha: swap `OpenAIResponsesModel` for `OpenAIChatCompletionsModel`. Local backends speak /v1/chat/completions, not /v1/responses.

https://github.com/jeromeetienne/openai_api_local

---

## Bluesky (max 300 chars)

The OpenAI Agents JS SDK runs fine against LM Studio, Ollama, Gemini — same agent code, free inference.

Only catch: local backends implement /v1/chat/completions, not /v1/responses. So swap OpenAIResponsesModel → OpenAIChatCompletionsModel.

https://github.com/jeromeetienne/openai_api_local

---

## LinkedIn (800–1500 chars, multi-paragraph)

The OpenAI Agents JS SDK is genuinely nice for building agentic apps in TypeScript — tools, handoffs, structured outputs, the lot. The default narrative assumes you are calling api.openai.com and burning credits every iteration. You don't have to.

The same SDK happily talks to a model on your laptop (LM Studio, Ollama) or to Gemini's OpenAI-compatible endpoint. Same Agent shape, same OpenaiAgents.run(), same result. Only the URL and one class change.

The detail that catches everyone: LM Studio, Ollama, and Gemini implement /v1/chat/completions but NOT /v1/responses. So swap OpenAIResponsesModel for OpenAIChatCompletionsModel and point the OpenAI client at the local URL. That is the whole port.

What still works locally:
- Agents, instructions, the runner
- Tools (function calling), if the model supports it
- Structured outputs via Zod schemas
- Handoffs between agents

What does not: OpenAI-hosted built-ins (web search, file search, code interpreter) and the hosted tracing dashboard.

Two small libraries close the cost loop on top: openai-cache for content-addressed sqlite caching of identical requests, and openai-cost for per-bucket spend tracking. Both compose at the fetch layer, so they wrap the same OpenAI client the agent already uses.

Full how-to with runnable examples for LM Studio, Ollama, Gemini, and OpenAI:

https://github.com/jeromeetienne/openai_api_local

#TypeScript #OpenAI #LLM #LocalLLM #AgentSDK
