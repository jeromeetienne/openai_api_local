# Social posts — How to run the OpenAI API on alternative providers (local and cloud)

## Twitter / X (max 280 chars)

Same OpenAI client points at LM Studio, Ollama, or Gemini — only baseURL + apiKey change. For the Agents SDK also swap OpenAIResponsesModel → OpenAIChatCompletionsModel; alt providers don't implement /v1/responses.

github.com/jeromeetienne/openai_api_local

---

## Bluesky (max 300 chars)

Same OpenAI client code runs against LM Studio, Ollama, or Gemini — model becomes a config detail. The Agents SDK catch: alt providers expose /v1/chat/completions but not /v1/responses, so swap OpenAIResponsesModel → OpenAIChatCompletionsModel.

github.com/jeromeetienne/openai_api_local

---

## LinkedIn (800–1500 chars, multi-paragraph)

The OpenAI HTTP protocol has quietly become a lingua franca for chat-style LLMs. Once your code speaks it, the model on the other end of the wire is largely a configuration detail — not a rewrite.

Point the same OpenAI client at LM Studio on your laptop, Ollama in the background, or Google Gemini's OpenAI-compatible endpoint. Only the baseURL and apiKey change. Same imports, same types, same downstream code.

One gotcha specific to the OpenAI Agents JS SDK: LM Studio, Ollama, and Gemini all implement /v1/chat/completions but NOT the newer /v1/responses. Swap OpenAIResponsesModel for OpenAIChatCompletionsModel and you're done. With plain chat.completions you don't even need that — just the baseURL/apiKey change.

What survives the swap:

- new Agent({ name, instructions, model }) — same shape
- OpenaiAgents.run() — runner, retries, turn loop are SDK-side
- Tools / function calling — works wherever the model supports it (Llama 3.1+, Qwen 2.5+, Mistral)
- Structured outputs via Zod — most backends grammar-constrain it for you
- Agent-to-agent handoffs — SDK-orchestrated, just work

What doesn't: OpenAI-hosted built-ins (web search, file search, code interpreter) and the hosted tracing dashboard.

The whole pitch: the model becomes a configuration choice, not an architectural one. Try the same prompt on four different backends in an afternoon.

Full how-to and runnable examples:
https://github.com/jeromeetienne/openai_api_local

#TypeScript #OpenAI #LocalLLM #AgentsSDK #LLMOps
