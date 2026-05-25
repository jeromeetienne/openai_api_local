# Social posts — How to run the OpenAI API on something that isn't OpenAI

## Twitter / X (max 280 chars)

The OpenAI HTTP protocol quietly became the QWERTY of LLMs. Point your client at LM Studio, Ollama, or Gemini — tools, handoffs, structured outputs unchanged. One Agents SDK trap: use OpenAIChatCompletionsModel. github.com/jeromeetienne/openai_api_local

---

## Bluesky (max 300 chars)

The OpenAI HTTP protocol quietly became the QWERTY of LLMs. Once your code talks to api.openai.com, it can talk to LM Studio, Ollama, or Gemini — agents, tools, structured outputs unchanged. One Agents SDK trap: use OpenAIChatCompletionsModel. github.com/jeromeetienne/openai_api_local

---

## LinkedIn (800–1500 chars, multi-paragraph)

The OpenAI HTTP protocol has quietly become the QWERTY of LLMs. Nobody voted on it, nobody sat down and standardized it, and yet here we are: half the model servers on the planet speak it.

Which means once your code knows how to talk to api.openai.com, it also knows how to talk to a model on your laptop, on someone else's laptop, or in a Google data center — without rewriting a line of business logic.

What you actually change:

• Point the OpenAI client at a different baseURL and apiKey. That's the whole story for plain chat.completions.
• On the Agents SDK, swap OpenAIResponsesModel for OpenAIChatCompletionsModel. LM Studio, Ollama, and Gemini all speak /v1/chat/completions but NOT /v1/responses — that's the entire trap.
• Use a MODEL=<id> env var so you can A/B four backends in an afternoon instead of an afternoon per backend.

What still works: agents, instructions, function tools, structured outputs via Zod schemas, handoffs, the runner. The model becomes a configuration line, not an architectural decision.

What doesn't: OpenAI's hosted built-ins (web search, code interpreter, computer use) and the hosted tracing dashboard. Those are Responses-API features that only exist at openai.com — rebuild them as regular function tools if you need them.

Try the same prompt across four backends this afternoon. Picking which models will take longer than wiring them up.

github.com/jeromeetienne/openai_api_local

#TypeScript #OpenAI #LocalLLM #AgentsSDK #DevTools
