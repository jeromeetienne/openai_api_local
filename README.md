# openai_api_local

Minimal TypeScript examples for calling **OpenAI** and **LM Studio** through the same `openai` SDK — write the code once, swap the `baseURL` to flip between hosted and local inference.

Why two providers?
- **OpenAI** (`api.openai.com`) — frontier models, requires `OPENAI_API_KEY`, costs money.
- **LM Studio** — runs any GGUF chat model on your laptop, exposes an OpenAI-compatible server, no key, no network, no cost.

Because LM Studio implements the OpenAI HTTP protocol, the only thing that changes between them is the client config. The shared factory that picks the right client lives in [src/libs/utils-ai.ts](src/libs/utils-ai.ts).

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
2. Open **Developer → Start Server** (defaults to `http://localhost:1234`).
3. Load any chat-capable model (e.g. `qwen/qwen3-4b`).
4. If your loaded model id differs from the example default, override it: `MODEL=<id> npm run example:chat-lmstudio`.

## Examples

| Script | What it does |
| --- | --- |
| `npm run example:chat-openai` | Basic `chat.completions` call against OpenAI. |
| `npm run example:chat-lmstudio` | Same call, routed to your local LM Studio server. |
| `npm run example:agent-openai` | Minimal [@openai/agents](https://openai.github.io/openai-agents-js/) run via OpenAI (uses the Responses API). |
| `npm run example:agent-lmstudio` | Same agent, routed to LM Studio. Uses the Chat Completions model class because LM Studio doesn't implement `/v1/responses`. |
| `npm run example:chat-openai-full` | OpenAI chat call wrapped with [openai-cache](https://www.npmjs.com/package/openai-cache) and [openai-cost](https://www.npmjs.com/package/openai-cost), both backed by sqlite. Sqlite files land in `outputs/`. Run twice to see the second run served from cache. |

Every example accepts `MODEL=<id>` to override its default:

```sh
MODEL=gpt-4o npm run example:chat-openai
MODEL=qwen/qwen3-8b npm run example:chat-lmstudio
```

## How the shared client works

`UtilsAi.getOpenAiClient({ provider })` returns a configured `OpenAI` instance:

- `provider: 'openai'` → `new OpenAI()` (reads `OPENAI_API_KEY` from env).
- `provider: 'lmstudio'` → `new OpenAI({ baseURL: 'http://localhost:1234/v1', apiKey: 'lm-studio' })`.

`UtilsAi.providerFromModelName(modelName)` is a small heuristic for picking a provider from a model id:
- `gpt-*` and `o<digit>*` → `openai`
- anything namespaced like `qwen/qwen3-4b` → `lmstudio`

## Project layout

```
src/
  libs/utils-ai.ts        shared OpenAI client factory (openai | lmstudio)
  index.ts                tiny entry point that just prints the example list
examples/
  openai-chat-openai.ts        chat.completions, OpenAI
  openai-chat-lmstudio.ts      chat.completions, LM Studio
  agent-sdk-openai.ts          @openai/agents, OpenAI (Responses API)
  agent-sdk-lmstudio.ts        @openai/agents, LM Studio (Chat Completions API)
  openai-chat-openai-full.ts   + openai-cache + openai-cost, sqlite-backed
outputs/                  generated sqlite files for the "full" example
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run `src/index.ts` via `tsx`. |
| `npm run build` | Type-check and compile to `dist/`. |
| `npm run start` | Run the compiled `dist/index.js`. |
| `npm run typecheck` | `tsc --noEmit`. |

## Stack

- TypeScript (ES2020, strict), executed with [`tsx`](https://github.com/privatenumber/tsx)
- [`openai`](https://www.npmjs.com/package/openai) SDK
- [`@openai/agents`](https://openai.github.io/openai-agents-js/) for the agent examples
- [`openai-cache`](https://www.npmjs.com/package/openai-cache) + [`openai-cost`](https://www.npmjs.com/package/openai-cost) (sqlite) in the "full" example
- Zod for runtime validation
