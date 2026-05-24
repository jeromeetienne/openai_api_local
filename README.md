# openai_api_local

Minimal TypeScript examples for using [OpenAI Agents](https://github.com/openai/openai-agents-js) using models from [**OpenAI**](https://github.com/openai/openai-node), [**LM Studio**](https://github.com/lmstudio-ai), [**Ollama**](https://github.com/ollama/ollama), and [**Google Gemini**](https://ai.google.dev/gemini-api/docs/openai) - write the code once, swap the `baseURL` to flip between hosted and local inference.


Why four providers?
- [**OpenAI**](https://github.com/openai/openai-node) (`api.openai.com`) — frontier models, requires `OPENAI_API_KEY`, costs money.
- [**LM Studio**](https://github.com/lmstudio-ai) — runs any GGUF chat model on your laptop, exposes an OpenAI-compatible server, no key, no network, no cost.
- [**Ollama**](https://github.com/ollama/ollama) — same idea as LM Studio, CLI-first instead of GUI-first, also exposes an OpenAI-compatible endpoint.
- [**Google Gemini**](https://ai.google.dev/gemini-api/docs/openai) — hosted Gemini models exposed through an OpenAI-compatible endpoint, requires `GEMINI_API_KEY`.

Because LM Studio, Ollama, and Gemini all implement the OpenAI HTTP protocol, the only thing that changes between them is the client config:

- OpenAI — `new OpenAI()` (reads `OPENAI_API_KEY` from env)
- LM Studio — `new OpenAI({ baseURL: 'http://localhost:1234/v1', apiKey: 'lm-studio' })`
- Ollama — `new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' })`
- Gemini — `new OpenAI({ baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKey: process.env.GEMINI_API_KEY })`

## Setup

```sh
npm install
```

### To use OpenAI

```sh
export OPENAI_API_KEY=sk-...
```

### To use LM Studio

1. Install [LM Studio](https://lmstudio.ai/).
2. Start the server: `lms server start` (defaults to `http://localhost:1234`).
3. Load a chat-capable model: `lms load liquiq/lfm2.5-1.2b`.
4. If your loaded model id differs from the example default, override it: `MODEL=<id> npm run example:chat_lmstudio`.

### To use Ollama

1. Install [Ollama](https://ollama.com/).
2. Pull a chat model: `ollama pull llama3.2:1b` (the desktop app auto-starts the server; otherwise run `ollama serve`).
3. Server defaults to `http://localhost:11434`.
4. Override the model id if needed: `MODEL=<id> npm run example:chat_ollama` (Ollama model ids look like `llama3.2`, `qwen3:4b`, `mistral`, etc.).

### To use Google Gemini

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Export it: `export GEMINI_API_KEY=...`.
3. Endpoint is `https://generativelanguage.googleapis.com/v1beta/openai/` (Gemini's OpenAI-compatible layer, see [docs](https://ai.google.dev/gemini-api/docs/openai)).
4. Override the model id if needed: `MODEL=<id> npm run example:chat_gemini` (e.g. `gemini-2.5-flash`, `gemini-2.5-pro`).

## Examples

| Script | What it does |
| --- | --- |
| `npm run example:chat_openai` | Basic `chat.completions` call against OpenAI. |
| `npm run example:chat_lmstudio` | Same call, routed to your local LM Studio server. |
| `npm run example:chat_ollama` | Same call, routed to your local Ollama server. |
| `npm run example:chat_gemini` | Same call, routed to Google Gemini's OpenAI-compatible endpoint. |
| `npm run example:agent_openai` | Minimal [@openai/agents](https://openai.github.io/openai-agents-js/) run via OpenAI (uses the Responses API). |
| `npm run example:agent_lmstudio` | Same agent, routed to LM Studio. Uses the Chat Completions model class because LM Studio doesn't implement `/v1/responses`. |
| `npm run example:agent_ollama` | Same agent, routed to Ollama. Also uses the Chat Completions model class (Ollama doesn't implement `/v1/responses` either). |
| `npm run example:agent_gemini` | Same agent, routed to Gemini. Also uses the Chat Completions model class (Gemini's OpenAI shim doesn't implement `/v1/responses`). |
| `npm run example:chat_openai_full` | OpenAI chat call wrapped with [openai-cache](https://github.com/jeromeetienne/openai-cache) and [openai-cost](https://github.com/jeromeetienne/openai-cost), both backed by sqlite. Sqlite files land in `outputs/`. Run twice to see the second run served from cache. |

Every example accepts `MODEL=<id>` to override its default:

```sh
MODEL=gpt-4o npm run example:chat_openai
MODEL=qwen/qwen3-8b npm run example:chat_lmstudio
MODEL=qwen3:4b npm run example:chat_ollama
MODEL=gemini-2.5-pro npm run example:chat_gemini
```

## Project layout

```
examples/
  openai_chat_openai.ts        chat.completions, OpenAI
  openai_chat_lmstudio.ts      chat.completions, LM Studio
  openai_chat_ollama.ts        chat.completions, Ollama
  openai_chat_gemini.ts        chat.completions, Google Gemini (OpenAI-compat)
  agent_sdk_openai.ts          @openai/agents, OpenAI (Responses API)
  agent_sdk_lmstudio.ts        @openai/agents, LM Studio (Chat Completions API)
  agent_sdk_ollama.ts          @openai/agents, Ollama (Chat Completions API)
  agent_sdk_gemini.ts          @openai/agents, Gemini (Chat Completions API)
  openai_chat_openai_full.ts   + openai-cache + openai-cost, sqlite-backed
outputs/                       generated sqlite files for the "full" example
```

## openai-cache and openai-cost

The "full" example layers two small wrappers around the `openai` client's `fetch`. Both are sqlite-backed, so they survive restarts with zero infrastructure:

- [**openai-cache**](https://github.com/jeromeetienne/openai-cache) — content-addressed cache for chat completions. Same `model` + `messages` + params → same key → response served from sqlite instead of hitting the network. Great for deterministic re-runs during development, eval suites, or anything where you're calling the same prompt repeatedly while iterating on surrounding code.
- [**openai-cost**](https://github.com/jeromeetienne/openai-cost) — records every call (model, tokens in/out, computed USD cost, bucket id) into sqlite so you can see exactly what a run cost and group spending by feature/script/user.

The cool part: **openai-cache works just as well against LM Studio and Ollama** as it does against OpenAI. Because the cache key is built from the request payload — not the upstream URL — and because the wrapper sits at the HTTP fetch layer, it doesn't care whether the response came from `api.openai.com` or `localhost:11434`. Net effect: even your local-only setup gets instant replays of previous prompts, which is genuinely handy when you're iterating on prompt text and don't want to re-spin a 4B model every time.

(openai-cost is OpenAI-specific in practice — it prices calls using OpenAI's published rates, and local inference is free anyway, so there's nothing to track.)

See [examples/openai_chat_openai_full.ts](examples/openai_chat_openai_full.ts) for the composition pattern (cost tracker wraps cache wraps global `fetch`).

## Stack

- [`openai`](https://www.npmjs.com/package/openai) SDK
- [`@openai/agents`](https://openai.github.io/openai-agents-js/) for the agent examples
- [`openai-cache`](https://github.com/jeromeetienne/openai-cache) + [`openai-cost`](https://github.com/jeromeetienne/openai-cost) (sqlite) in the "full" example
