# openai_api_local

Minimal examples showing how to call OpenAI models two ways:

1. **OpenAI** — against `api.openai.com` (needs `OPENAI_API_KEY`)
2. **LM Studio** — against a local [LM Studio](https://lmstudio.ai/) server (no API key, runs offline)

Both paths reuse the same `openai` SDK; only the `baseURL` differs. The shared helper that picks the right client lives in [src/libs/utils-ai.ts](src/libs/utils-ai.ts).

## Setup

```sh
npm install
```

For the OpenAI examples:

```sh
export OPENAI_API_KEY=sk-...
```

For the LM Studio examples:

1. Open LM Studio → **Developer** → **Start Server** (defaults to `http://localhost:1234`).
2. Load any chat-capable model.
3. Override the model id in the example with `MODEL=<id>` if it doesn't match the default.

## Examples

| Script | What it does |
| --- | --- |
| `npm run example:chat-openai` | Basic `chat.completions` call via OpenAI |
| `npm run example:chat-lmstudio` | Same call, routed to LM Studio |
| `npm run example:agent-openai` | Minimal [@openai/agents](https://openai.github.io/openai-agents-js/) run via OpenAI (Responses API) |
| `npm run example:agent-lmstudio` | Same agent, routed to LM Studio (Chat Completions API — LM Studio doesn't implement `/v1/responses`) |
| `npm run example:chat-openai-full` | OpenAI chat call wrapped with [openai-cache](https://www.npmjs.com/package/openai-cache) and [openai-cost](https://www.npmjs.com/package/openai-cost) (sqlite-backed). Sqlite files land in `outputs/`. Run twice to see the second run served from cache. |

Each example accepts `MODEL=<id>` to override its default. E.g. `MODEL=gpt-4o npm run example:chat-openai`.
