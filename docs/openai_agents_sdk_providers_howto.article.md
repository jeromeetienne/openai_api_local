# How to run the OpenAI API on alternative providers (local and cloud)

The OpenAI HTTP protocol has become a *lingua franca* for chat-style LLMs. Once your
code speaks it, the model on the other end of the wire is largely a configuration
detail: you can keep talking to `api.openai.com`, or you can point the same client at
[LM Studio](https://lmstudio.ai/) on your laptop, [Ollama](https://ollama.com/) in the
background, or [Google Gemini](https://ai.google.dev/gemini-api/docs/openai) via its
OpenAI-compatible endpoint — without rewriting your application.

This guide shows how to do that swap with the [OpenAI Agents JS SDK](https://openai.github.io/openai-agents-js/)
and with plain `chat.completions`. The runnable companion code lives in the
[openai_api_local](https://github.com/jeromeetienne/openai_api_local) repo.

> Looking for cost-control techniques (caching with `openai-cache`, spend tracking with
> `openai-cost`, picking a provider to save money)? See the companion guide:
> [How to control OpenAI API costs](openai_api_cost_control_howto.article.md).

> **TL;DR** — swap `OpenAIResponsesModel` for `OpenAIChatCompletionsModel`, point the
> `OpenAI` client at `http://localhost:1234/v1` (LM Studio), `http://localhost:11434/v1`
> (Ollama), or `https://generativelanguage.googleapis.com/v1beta/openai/` (Google
> Gemini's OpenAI-compatible endpoint — hosted, not local, but the same class swap
> applies), and run.

---

## Why bother running on alternative providers?

A few reasons developers reach for this setup:

- **Iteration speed.** No round trip across the public internet. With a 1B–4B model on a
  modern laptop, you get sub-second responses for short prompts.
- **Cost.** Local inference is free. Iterating on a prompt, debugging a tool call, or
  rerunning an eval suite 200 times does not add a cent. Cheaper hosted providers like
  Gemini also bring the per-token bill down.
- **Privacy.** Whatever you send a local model stays on your machine. Useful when prompts
  contain proprietary code, customer data, or anything that should not leave the laptop.
- **Offline.** Planes, trains, conference Wi-Fi that requires logging into a captive
  portal you do not have credentials for — none of that matters when the model lives at
  `localhost`.

You give up frontier capability, of course. A 4B local model is not GPT-4o. But for a
huge chunk of agent development — wiring up tools, writing instructions, shaping
outputs, building evals — you do not need a frontier model. You need a model that
responds quickly so you can iterate.

---

## The one thing that catches everyone: Responses vs. Chat Completions

OpenAI's hosted API exposes two endpoints that can drive an agent:

- `/v1/chat/completions` — the older, ubiquitous one. Every OpenAI-compatible server in
  the wild implements it.
- `/v1/responses` — OpenAI's newer, stateful API. The Agents SDK defaults to this when
  you use `OpenAIResponsesModel`.

**LM Studio, Ollama, and Google Gemini's OpenAI-compatible endpoint all implement
`/v1/chat/completions` but NOT `/v1/responses`.**

That is the entire reason the non-OpenAI examples in this repo use a different model
class:

```ts
// Talking to api.openai.com → Responses API is fine
import { OpenAIResponsesModel } from '@openai/agents-openai';
const model = new OpenAIResponsesModel(openaiClient, modelName);

// Talking to localhost (LM Studio / Ollama) or Gemini → Chat Completions API
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';
const model = new OpenAIChatCompletionsModel(openaiClient, modelName);
```

Both classes are first-class citizens of `@openai/agents-openai`. The Agents SDK works
the same way with either — the only thing that changes is the underlying HTTP shape.

If you forget to swap the class and point a `OpenAIResponsesModel` at LM Studio, Ollama,
or Gemini, you'll get a `404` from the server. That is the symptom; the fix is the class
swap above.

> This Responses-vs-Chat-Completions distinction is **Agents SDK specific**. If you are
> calling `openaiClient.chat.completions.create()` directly, every provider here just
> works — you only change `baseURL` and `apiKey`.

---

## Setup

### 1. Install dependencies

```sh
npm install
```

The relevant packages are `openai`, `@openai/agents`, and `@openai/agents-openai`.

### 2. Pick a backend

#### Option A — LM Studio (local, GUI-first)

1. Install [LM Studio](https://lmstudio.ai/).
2. Start the local server: `lms server start` (defaults to `http://localhost:1234`).
3. Load a chat-capable model — for example: `lms load liquid/lfm2.5-1.2b`.

#### Option B — Ollama (local, CLI-first)

1. Install [Ollama](https://ollama.com/).
2. Pull a chat model: `ollama pull llama3.2:1b`.
3. The desktop app auto-starts the server. Otherwise run `ollama serve`. Defaults to
   `http://localhost:11434`.

#### Option C — Google Gemini (hosted, OpenAI-compatible)

Gemini is *not* local, but it speaks the same OpenAI HTTP protocol and exposes only
`/v1/chat/completions` (no `/v1/responses`), so the wiring is identical to the local
backends — same model class, same client shape, only the URL and API key change.

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Export it: `export GEMINI_API_KEY=...`.
3. Endpoint is `https://generativelanguage.googleapis.com/v1beta/openai/`. Full
   reference: <https://ai.google.dev/gemini-api/docs/openai>.

All three backends expose an OpenAI-compatible HTTP API. From the SDK's perspective, the
only thing that changes between them is the URL and the API key.

---

## Minimal example, step by step

Here is the complete LM Studio version, lifted from
[examples/agent_sdk_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_lmstudio.ts):

```ts
import { OpenAI } from 'openai';
import OpenaiAgents from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';

const modelName = process.env.MODEL ?? 'liquid/lfm2.5-1.2b';

// 1. Point the OpenAI client at the local server.
const openaiClient = new OpenAI({
        baseURL: 'http://localhost:1234/v1',
        apiKey: 'lm-studio', // any non-empty string works; the server ignores it
});

// 2. Wrap it in the Chat Completions model class (NOT Responses).
const model = new OpenAIChatCompletionsModel(openaiClient, modelName);

// 3. From here on it's vanilla @openai/agents.
const agent = new OpenaiAgents.Agent({
        name: 'OctopusBot',
        instructions: 'You answer in a single short sentence.',
        model,
});

const result = await OpenaiAgents.run(
        agent,
        'Say hello and name one fun fact about octopuses.',
);

console.log(`[model=${modelName}] ${result.finalOutput ?? '(no output)'}`);
```

Run it:

```sh
npm run example:agent_lmstudio
```

For Ollama, only two lines change — the `baseURL` and the `apiKey`:

```ts
const openaiClient = new OpenAI({
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama',
});
```

See [examples/agent_sdk_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_ollama.ts) for the full file.

For Gemini, the same two lines change again — point at Google's OpenAI-compatible
endpoint and use the `GEMINI_API_KEY` env var as a real API key (unlike the placeholder
strings the local servers accept):

```ts
const openaiClient = new OpenAI({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.GEMINI_API_KEY,
});
```

See [examples/agent_sdk_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_gemini.ts) for the full file.

For comparison, the OpenAI-hosted version
([examples/agent_sdk_openai.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_openai.ts)) is identical except
for the model class:

```ts
import { OpenAIResponsesModel } from '@openai/agents-openai';

const openaiClient = new OpenAI(); // reads OPENAI_API_KEY from env
const model = new OpenAIResponsesModel(openaiClient, modelName);
```

Same agent definition. Same `OpenaiAgents.run()` call. Same `result.finalOutput`. The
only difference is *where the tokens are computed*.

### Also works with plain `chat.completions`

You don't need the Agents SDK to benefit from this. The same `baseURL` / `apiKey`
swap works for raw `chat.completions` calls — and there you don't even need the
Responses-vs-Chat-Completions class dance, because there's no class to swap:

```ts
import { OpenAI } from 'openai';

const openaiClient = new OpenAI({
        baseURL: 'http://localhost:1234/v1',
        apiKey: 'lm-studio',
});

const response = await openaiClient.chat.completions.create({
        model: 'liquid/lfm2.5-1.2b',
        messages: [
                { role: 'system', content: 'You answer in a single short sentence.' },
                { role: 'user', content: 'Say hello and name one fun fact about octopuses.' },
        ],
});
```

Per-provider chat-completions runners that mirror the Agents SDK examples above:

- [examples/openai_chat_openai.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_openai.ts)
- [examples/openai_chat_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_lmstudio.ts)
- [examples/openai_chat_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_ollama.ts)
- [examples/openai_chat_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_gemini.ts)

---

## What still works locally

Most of the Agents SDK does not care whether the model lives on OpenAI's servers or your
laptop. You keep:

- **Agents and instructions.** The `new Agent({ name, instructions, model })` shape is
  unchanged.
- **`OpenaiAgents.run()`.** The runner, retries, and turn loop are SDK-side, not
  server-side.
- **Tools.** Function calling works as long as the local model is trained for it.
  Llama 3.1+, Qwen 2.5+, Mistral, and most modern chat models support tool calls via the
  Chat Completions API. Smaller models (1B–3B) can be hit-or-miss on tool reliability —
  if your agent stops calling tools, try a larger model before you blame your prompt.
- **Structured outputs.** Pass a Zod schema as your agent's `outputType` and you get
  validated JSON back. Most local backends translate this to grammar-constrained
  decoding, which is fast and reliable.
- **Handoffs.** Agent-to-agent handoffs are SDK-orchestrated, so they just work.

## What is more limited

- **Built-in OpenAI-hosted tools** (web search, file search, code interpreter, computer
  use) are part of the Responses API and *not* available locally. You can replicate any
  of them with your own function tools, but the SDK's built-in handles will not work
  against a local backend.
- **Tracing.** The hosted Agents tracing dashboard expects OpenAI as the backend. Local
  runs are not traced there. Use console logs, the `AGENTS_SDK_DEBUG` env var, or pipe
  events to your own sink.
- **Model quality.** A 1B model is a 1B model. If your agent needs nuanced reasoning,
  develop locally for the wiring and switch the model class back to
  `OpenAIResponsesModel` (or any frontier provider's adapter) for the high-stakes runs.

---

## Useful tricks

### Override the model from the CLI

Every example in this repo accepts a `MODEL=<id>` env var:

```sh
MODEL=qwen/qwen3-8b   npm run example:agent_lmstudio
MODEL=qwen3:4b        npm run example:agent_ollama
MODEL=gemini-2.5-pro  npm run example:agent_gemini
MODEL=gpt-4o          npm run example:agent_openai
```

That makes it trivial to A/B a prompt across several backends without editing code.

### Sanity-check the backend is alive

If `npm run example:agent_lmstudio` hangs or 404s, hit the OpenAI-compatible endpoint
directly:

```sh
curl http://localhost:1234/v1/models           # LM Studio
curl http://localhost:11434/v1/models          # Ollama
curl https://generativelanguage.googleapis.com/v1beta/openai/models \
        -H "Authorization: Bearer $GEMINI_API_KEY"   # Gemini
```

All three should list the models the backend currently knows about. If the local ones
do not, the server is not running (or is on a different port). If Gemini returns a
`401`/`403`, double-check `GEMINI_API_KEY`.

---

## Recap

Running the OpenAI Agents JS SDK against an alternative provider comes down to three
lines:

```ts
const openaiClient = new OpenAI({ baseURL: 'http://localhost:1234/v1', apiKey: 'lm-studio' });
const model = new OpenAIChatCompletionsModel(openaiClient, modelName);
const agent = new OpenaiAgents.Agent({ name: 'OctopusBot', instructions: '…', model });
```

Everything else — agents, tools, handoffs, `OpenaiAgents.run()`, structured outputs —
is exactly the code you would have written against OpenAI. That is the whole pitch of an
"OpenAI-compatible" stack: the model becomes a configuration choice, not an
architectural one.

Have fun. Build something. Try the same prompt on four different models in an
afternoon.

## Further reading

- OpenAI Agents JS SDK: <https://openai.github.io/openai-agents-js/>
- OpenAI Agents JS GitHub: <https://github.com/openai/openai-agents-js>
- OpenAI's Agents guide: <https://developers.openai.com/api/docs/guides/agents>
- LM Studio: <https://lmstudio.ai/>
- Ollama: <https://ollama.com/>
- Gemini's OpenAI-compatible endpoint: <https://ai.google.dev/gemini-api/docs/openai>
- Companion guide: [How to control OpenAI API costs](openai_api_cost_control_howto.article.md)
- Runnable Agents SDK examples in this repo:
  [examples/agent_sdk_openai.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_openai.ts),
  [examples/agent_sdk_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_lmstudio.ts),
  [examples/agent_sdk_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_ollama.ts),
  [examples/agent_sdk_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_gemini.ts).
- Runnable chat-completions examples in this repo:
  [examples/openai_chat_openai.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_openai.ts),
  [examples/openai_chat_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_lmstudio.ts),
  [examples/openai_chat_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_ollama.ts),
  [examples/openai_chat_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_gemini.ts).
