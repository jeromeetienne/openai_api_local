# How to control the cost of the OpenAI API

Using the OpenAI API is great until the bill arrives. The good news is that everything
that speaks the OpenAI HTTP protocol — the official API, the [OpenAI Agents JS SDK](https://openai.github.io/openai-agents-js/),
the chat-completions client — also accepts the same set of cost-control tricks. You
don't rewrite your application; you wrap the `OpenAI` client.

This guide walks through four levers, in roughly increasing cost. The runnable
companion code lives in the [openai_api_local](https://github.com/jeromeetienne/openai_api_local)
repo.

## The four levers

1. **Run the model locally** — with [LM Studio](https://lmstudio.ai/) or
   [Ollama](https://ollama.com/), the model lives on your laptop. No API key, no
   network, no bill. Cheapest possible inference: free.
2. **Use a cheaper hosted provider** — [Google Gemini](https://ai.google.dev/gemini-api/docs/openai)
   exposes an OpenAI-compatible endpoint with a different price sheet. Same code, lower
   per-token cost than `api.openai.com`.
3. **Cache hosted calls** — when you *do* hit `api.openai.com`, wrap the client in
   [openai-cache](https://github.com/jeromeetienne/openai-cache) so identical requests
   come back from a local sqlite file instead of from OpenAI. Second call onward costs
   nothing.
4. **Track what you spent** — for whatever you couldn't cache or run locally,
   [openai-cost](https://github.com/jeromeetienne/openai-cost) records every paid call
   into sqlite with a bucket id so you can see, per feature or per script, exactly what
   it cost.

The unifying trick is that all four plug into the same `OpenAI` client — same imports,
same types, same downstream code. Whether you call `openaiClient.chat.completions.create()`
or hand the client to `OpenAIChatCompletionsModel` for the Agents SDK, the wrapping is
identical.

> If you haven't seen how to point the client at a non-OpenAI provider, start with the
> companion guide: [How to run the OpenAI API on alternative providers](openai_agents_sdk_providers_howto.article.md).

---

## Lever 1 — Run the model locally

Local inference is free and offline. If you're iterating on a prompt or debugging tool
calls, every run after the first is wasted money against a hosted backend — and a 1B–4B
local model is plenty for that loop.

The how-to (LM Studio, Ollama, model setup) lives in
[the providers guide](openai_agents_sdk_providers_howto.article.md). The minimal
canonical examples are:

- Agents SDK against LM Studio:
  [examples/agent_sdk_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_lmstudio.ts)
- Agents SDK against Ollama:
  [examples/agent_sdk_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_ollama.ts)
- Plain `chat.completions` against LM Studio:
  [examples/openai_chat_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_lmstudio.ts)
- Plain `chat.completions` against Ollama:
  [examples/openai_chat_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_ollama.ts)

Trade-off: a local 4B model is not GPT-4o. Use it for the iteration loop and switch back
to a frontier model for the runs that actually matter.

---

## Lever 2 — Use a cheaper hosted provider (Gemini)

When you do need a hosted model — better quality, no GPU on the machine, predictable
latency — you don't have to default to `api.openai.com`. Google Gemini's
OpenAI-compatible endpoint speaks the same protocol and bills at Gemini prices, which
are typically lower than the equivalent OpenAI tier.

Switching is a `baseURL` + `apiKey` change:

```ts
const openaiClient = new OpenAI({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.GEMINI_API_KEY,
});
```

Canonical examples:

- Agents SDK against Gemini:
  [examples/agent_sdk_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_gemini.ts)
- Plain `chat.completions` against Gemini:
  [examples/openai_chat_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_gemini.ts)

Gemini implements `/v1/chat/completions` but not `/v1/responses`, so if you're on the
Agents SDK you need `OpenAIChatCompletionsModel` rather than `OpenAIResponsesModel` —
see [the providers guide](openai_agents_sdk_providers_howto.article.md#the-one-thing-that-catches-everyone-responses-vs-chat-completions)
for the details on that catch.

---

## Lever 3 — Cache hosted calls with openai-cache

Any non-trivial development loop calls your model on the same input dozens of times
while you tweak surrounding code. Even on a cheap model that adds up — both in seconds
of waiting and in dollars.

[**openai-cache**](https://github.com/jeromeetienne/openai-cache) makes those repeats
instant *and* free. It is a content-addressed cache for OpenAI-style requests: same
`model` + `messages` + params produces the same key, and the response is served straight
from sqlite instead of from the model. Sqlite-backed means **zero infrastructure** — no
Redis, no daemon, just a file in `outputs/`.

**The key trick: openai-cache works against any backend.** It sits at the HTTP fetch
layer and keys off the request payload, so it does not care whether the response would
have come from `api.openai.com`, Gemini, or `localhost:11434`. Iterating on a prompt
with a 4B local model and re-running the same input ten times? The first run goes to
the model, the next nine come back from sqlite in milliseconds.

The composition trick is that the OpenAI client accepts a custom `fetch`, and both
`chat.completions` and the Agents SDK use that client underneath — so caching the fetch
caches everything:

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

The same wiring works against `api.openai.com` — drop the `baseURL`/`apiKey` overrides
and you have a hosted-call cache. For plain `chat.completions`, the only thing that
changes is the last block: instead of building an agent, you call
`openaiClient.chat.completions.create(...)` directly. The fetch wrapper does its job
either way.

---

## Lever 4 — Track spend with openai-cost

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

## Putting it all together

The repo includes a single script that exercises every combination of the four levers:
[examples/openai_chat_full.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_full.ts).

It runs the same chat completion across every provider (OpenAI, LM Studio, Ollama,
Gemini) crossed with every combination of the two `fetch` wrappers (with/without
`openai-cache`, with/without `openai-cost`) — 4 providers × 4 wrapper combos = 16
cells. Providers whose env var or local server isn't available are skipped.

Run it twice and watch the cache-enabled cells flip to `cache:true` on the second
pass. At the end you get a per-bucket cost summary out of the sqlite tracker.

It's the most concise demonstration that all four levers compose: same client shape,
same downstream code, different `fetch` wiring.

---

## Recap

The cost of running OpenAI-API-shaped code is not a fixed number — it's a choice
between four levers that all attach to the same `OpenAI` client:

1. **Local** for the iteration loop (free).
2. **Cheaper hosted provider** when you need a real model but not a frontier one.
3. **Cache** so the same prompt only ever costs you once.
4. **Cost ledger** so you actually know what the rest cost.

Pick the cheapest lever that meets your quality bar for any given call. Stack them
when it helps. Watch your token bill not move.

## Further reading

- openai-cache: <https://github.com/jeromeetienne/openai-cache>
- openai-cost: <https://github.com/jeromeetienne/openai-cost>
- LM Studio: <https://lmstudio.ai/>
- Ollama: <https://ollama.com/>
- Gemini's OpenAI-compatible endpoint: <https://ai.google.dev/gemini-api/docs/openai>
- Companion guide: [How to run the OpenAI API on alternative providers](openai_agents_sdk_providers_howto.article.md)
- The full provider × wrapper matrix runner:
  [examples/openai_chat_full.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_full.ts)
- Per-provider chat-completions examples:
  [openai](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_openai.ts),
  [lmstudio](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_lmstudio.ts),
  [ollama](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_ollama.ts),
  [gemini](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_gemini.ts).
- Per-provider Agents SDK examples:
  [openai](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_openai.ts),
  [lmstudio](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_lmstudio.ts),
  [ollama](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_ollama.ts),
  [gemini](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_gemini.ts).
