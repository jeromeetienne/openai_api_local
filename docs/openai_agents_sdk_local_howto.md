# How to run the OpenAI Agents JS SDK against local models

The [OpenAI Agents JS SDK](https://openai.github.io/openai-agents-js/) is one of the
nicest ways to build agentic apps in TypeScript today — tools, handoffs, tracing, and
guardrails all live behind a small API surface. But the official narrative assumes you
are calling `api.openai.com` and burning credits every time you iterate.

This article is really about one thing: **keeping the cost of running OpenAI-style AI under control**, all through a single API surface. The repo is [openai_api_local](https://github.com/jeromeetienne/openai_api_local).

The OpenAI HTTP protocol has become a *lingua franca*; once your code speaks it, you get three cost-control levers you can pull, in roughly increasing cost:

1. **Run the model locally** — with [LM Studio](https://lmstudio.ai/) or
   [Ollama](https://ollama.com/), the model lives on your laptop. No API key, no
   network, no bill. Cheapest possible inference: free.
2. **Cache hosted calls** — when you *do* hit `api.openai.com`, wrap the client in
   [openai-cache](https://github.com/jeromeetienne/openai-cache) so identical requests
   come back from a local sqlite file instead of from OpenAI. Cheaper than uncached
   OpenAI, because the second call onward costs nothing.
3. **Track what you spent** — for whatever you couldn't cache or run locally,
   [openai-cost](https://github.com/jeromeetienne/openai-cost) records every paid call into sqlite with a bucket id so you can see, per feature or per script, exactly what it cost.

The unifying trick is that all three plug into the same `OpenAI` client — same
imports, same types, same agent code. **This guide focuses on lever #1**: getting the
Agents SDK pointed at a local model. Levers #2 and #3 get their own sections later
in the article because they compose cleanly on top of the same wiring.

> **TL;DR** — swap `OpenAIResponsesModel` for `OpenAIChatCompletionsModel`, point the
> `OpenAI` client at `http://localhost:1234/v1` (LM Studio), `http://localhost:11434/v1`
> (Ollama), or `https://generativelanguage.googleapis.com/v1beta/openai/` (Google
> Gemini's OpenAI-compatible endpoint — hosted, not local, but the same class swap
> applies), and run.

---

## Why bother running the Agents SDK locally?

A few reasons developers reach for this setup:

- **Iteration speed.** No round trip across the public internet. With a 1B–4B model on a
  modern laptop, you get sub-second responses for short prompts.
- **Cost.** Local inference is free. Iterating on a prompt, debugging a tool call, or
  rerunning an eval suite 200 times does not add a cent.
- **Privacy.** Whatever you send the model stays on your machine. Useful when prompts
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

## Caching agent responses with openai-cache

The Agents SDK calls your model on every `OpenaiAgents.run()` invocation. During
development that means re-running the same prompt against the same model dozens of
times while you tweak surrounding code. Even on a fast local model, that adds up to
real seconds of waiting per save.

[**openai-cache**](https://github.com/jeromeetienne/openai-cache) makes those repeats
instant. It is a content-addressed cache for OpenAI-style requests: same `model` +
`messages` + params produces the same key, and the response is served straight from
sqlite instead of from the model. Sqlite-backed means **zero infrastructure** — no
Redis, no daemon, just a file in `outputs/`.

**The killer detail: openai-cache works against local backends too.** It sits at the
HTTP fetch layer and keys off the request payload, so it does not care whether the
response would have come from `api.openai.com` or `localhost:11434`. Iterating on a
prompt with a 4B local model and re-running the same input ten times? The first run
goes to the model, the next nine come back from sqlite in milliseconds.

The composition trick is that the OpenAI client accepts a custom `fetch`, and the
Agents SDK uses that client underneath — so caching the fetch caches the agent:

```ts
import { OpenAI } from 'openai';
import OpenaiAgents from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';
import { Cacheable } from 'cacheable';
import OpenAICache from 'openai-cache';
import KeyvSqlite from '@keyv/sqlite';

// 1. sqlite-backed cache
const sqliteCache = new Cacheable({
        secondary: new KeyvSqlite('sqlite://./outputs/.openai_cache.sqlite'),
});
const openaiCache = new OpenAICache(sqliteCache, { markResponseEnabled: true });

// 2. OpenAI client points at Ollama, with the cached fetch wired in
const openaiClient = new OpenAI({
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama',
        fetch: openaiCache.getFetchFn(),
});

// 3. agent code below is unchanged
const model = new OpenAIChatCompletionsModel(openaiClient, 'llama3.2:1b');
const agent = new OpenaiAgents.Agent({
        name: 'OctopusBot',
        instructions: 'You answer in a single short sentence.',
        model,
});

const result = await OpenaiAgents.run(agent, 'Say hello.');
```

When `markResponseEnabled: true` is set, the cache stamps cached responses with
`x_from_openai_cache: true`, so you can see at a glance which runs were served from
sqlite vs. recomputed.

The runnable composition pattern (cache + cost tracker around the OpenAI client) lives
in [examples/openai_chat_openai_full.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_openai_full.ts).
It uses `chat.completions` directly, but the wrapping is identical for agents — just
hand the same `openaiClient` to `OpenAIChatCompletionsModel` (or `OpenAIResponsesModel`
for hosted runs).

---

## Tracking spend with openai-cost

The flip side of caching is knowing what you spent when you *don't* cache.

[**openai-cost**](https://github.com/jeromeetienne/openai-cost) records every call —
model, tokens in, tokens out, computed USD cost, and an arbitrary **bucket id** —
into a sqlite database. Bucket ids let you group spending by feature, script, user,
eval suite, or whatever dimension you care about. At the end of a run (or any time
later) you can call `getSummaryCosts()` and see exactly what each bucket cost.

It is OpenAI-specific in practice — local inference is free, so there is nothing to
price for LM Studio or Ollama runs. But for the parts of your stack that *do* hit
`api.openai.com`, this is a much nicer answer than squinting at the OpenAI billing
dashboard a week later.

Like openai-cache, it composes at the `fetch` layer:

```ts
import { OpenAI } from 'openai';
import OpenAiCost from 'openai-cost';
import { OpenAIResponsesModel } from '@openai/agents-openai';

const trackerSqlite = new OpenAiCost.OpenAiCostTrackerSqlite(
        './outputs/.openai_cost_tracker.sqlite',
);
await trackerSqlite.init();

const fetchWithTracking = await OpenAiCost.OpenAICallTracker.getFetchFn(
        await trackerSqlite.getTrackerCallback(),
        { bucketId: 'agent_octopusbot', originalFetch: openaiCache.getFetchFn() },
);

const openaiClient = new OpenAI({ fetch: fetchWithTracking });
const model = new OpenAIResponsesModel(openaiClient, 'gpt-4o-mini');
// ... build the agent and call OpenaiAgents.run() as usual

const summary = await trackerSqlite.getSummaryCosts();
console.log(summary); // → costs grouped by bucketId, model, etc.
```

Notice the `originalFetch: openaiCache.getFetchFn()` — that is the composition pattern
the full example uses: **cost tracker wraps cache wraps global fetch**. The order
matters. The cost tracker sees every *call* (so it knows the request was made), but
the cache may have already short-circuited the network. In practice this means
cached calls are reported with whatever the upstream would have charged — useful for
budgeting evals before you uncache them and actually pay.

---

## Recap

Running the OpenAI Agents JS SDK locally comes down to three lines:

```ts
const openaiClient = new OpenAI({ baseURL: 'http://localhost:1234/v1', apiKey: 'lm-studio' });
const model = new OpenAIChatCompletionsModel(openaiClient, modelName);
const agent = new OpenaiAgents.Agent({ name: 'OctopusBot', instructions: '…', model });
```

Everything else — agents, tools, handoffs, `OpenaiAgents.run()`, structured outputs —
is exactly the code you would have written against OpenAI. That is the whole pitch of an
"OpenAI-compatible" local stack, and it really does pay off as soon as you start
iterating.

Have fun. Build something. Watch your token bill not move.

## Further reading

- OpenAI Agents JS SDK: <https://openai.github.io/openai-agents-js/>
- OpenAI Agents JS GitHub: <https://github.com/openai/openai-agents-js>
- OpenAI's Agents guide: <https://developers.openai.com/api/docs/guides/agents>
- LM Studio: <https://lmstudio.ai/>
- Ollama: <https://ollama.com/>
- Gemini's OpenAI-compatible endpoint: <https://ai.google.dev/gemini-api/docs/openai>
- openai-cache: <https://github.com/jeromeetienne/openai-cache>
- openai-cost: <https://github.com/jeromeetienne/openai-cost>
- Runnable examples in this repo:
  [examples/agent_sdk_openai.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_openai.ts),
  [examples/agent_sdk_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_lmstudio.ts),
  [examples/agent_sdk_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_ollama.ts),
  [examples/agent_sdk_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_gemini.ts).
