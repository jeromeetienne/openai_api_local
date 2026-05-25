# How to stop the OpenAI API from eating your wallet

The OpenAI API is wonderful right up until the invoice arrives. The good news is
that the same HTTP protocol that makes the bill possible also makes the bill
*optional*. Everything that speaks OpenAI's wire format — the official API, the
[OpenAI Agents JS SDK](https://openai.github.io/openai-agents-js/), the
chat-completions client — also accepts the same set of cost-control tricks.

You don't rewrite your application. You wrap the `OpenAI` client. That's the whole
shape of this article.

There are four levers, in roughly increasing cost. Pull whichever ones meet your
quality bar. Stack them when it helps. The runnable code lives in the
[openai_api_local](https://github.com/jeromeetienne/openai_api_local) repo — when
you want to see exact lines, click through; the article keeps it light.

## The four levers, at a glance

1. **Run the model locally.** With [LM Studio](https://lmstudio.ai/) or
   [Ollama](https://ollama.com/), the model lives on your laptop. No API key, no
   network, no bill. Cheapest possible inference: free.
2. **Use a cheaper hosted provider.** [Google Gemini](https://ai.google.dev/gemini-api/docs/openai)
   exposes an OpenAI-compatible endpoint at Gemini prices. Same code, smaller bill.
3. **Cache hosted calls.** When you *do* call a paid API, wrap the client in
   [openai-cache](https://github.com/jeromeetienne/openai-cache) so identical
   requests come back from a local sqlite file. Second call onward: free.
4. **Track what you spent.** For everything you couldn't avoid paying for,
   [openai-cost](https://github.com/jeromeetienne/openai-cost) logs every call into
   sqlite with a bucket id, so you can see — per feature, per script, per
   experiment — exactly where the money went.

The reason all four compose so cleanly: they all attach to the same `OpenAI`
client. Whether your downstream code is `openaiClient.chat.completions.create()` or
an Agents SDK `OpenAIChatCompletionsModel`, the wrapping is identical. You wire
once; everything benefits.

> Haven't pointed your client at a non-OpenAI provider before? Start here:
> [How to run the OpenAI API on something that isn't OpenAI](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/docs/openai_agents_sdk_providers_howto.article.md).

---

## Lever 1 — Run the model locally (free)

Local inference is the cheat code. While you're iterating on a prompt, debugging a
tool call, or rerunning an eval for the fortieth time, hitting a hosted API is
just lighting money on fire. A 1B–4B model on your laptop is more than enough for
the inner loop.

The setup (LM Studio, Ollama, model picking) lives in
[the providers guide](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/docs/openai_agents_sdk_providers_howto.article.md). The minimal
canonical examples:

- Agents SDK: [agent_sdk_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_lmstudio.ts),
  [agent_sdk_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_ollama.ts)
- Plain `chat.completions`: [openai_chat_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_lmstudio.ts),
  [openai_chat_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_ollama.ts)

Trade-off: a 4B model isn't GPT-4o. Use it for the iteration loop; switch back to
a frontier model for the runs that actually matter.

---

## Lever 2 — Use a cheaper hosted provider (Gemini)

When you genuinely need a hosted model — better quality, no GPU on the machine,
predictable latency — you are not legally required to default to
`api.openai.com`. Google Gemini's OpenAI-compatible endpoint speaks the same
protocol and prices its tokens differently (typically lower for the comparable
tier).

Switching providers is a `baseURL` + `apiKey` change. That's it. The runnable
versions:

- Agents SDK: [agent_sdk_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_gemini.ts)
- Plain `chat.completions`: [openai_chat_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_gemini.ts)

One footnote: Gemini implements `/v1/chat/completions` but not `/v1/responses`, so
on the Agents SDK you want `OpenAIChatCompletionsModel`, not
`OpenAIResponsesModel`. The
[providers guide](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/docs/openai_agents_sdk_providers_howto.article.md#the-one-trap-declared-loudly)
explains why in more detail.

---

## Lever 3 — Cache hosted calls with openai-cache

Here's a fun number: count the times you've sent the same prompt to a model in
the last hour. Now multiply by your per-token price. Comforting, right?

[**openai-cache**](https://github.com/jeromeetienne/openai-cache) makes those
repeats instant *and* free. It is a content-addressed cache for OpenAI-style
requests: same `model` + `messages` + params produces the same key, and the
response is served straight from sqlite instead of from the model. Sqlite-backed
means **zero infrastructure** — no Redis, no daemon, just a file in `outputs/`.

The trick that makes openai-cache *delightful*: it sits at the HTTP `fetch`
layer. It doesn't care whether the call was going to `api.openai.com`, Gemini, or
`localhost:11434`. Iterate on a prompt with a local model and rerun the same
input ten times? First run actually goes through the model. The next nine come
back from sqlite in milliseconds.

The composition is the same client-shape pattern you've seen throughout this
article: you give the `OpenAI` client a custom `fetch`, and everything downstream
— `chat.completions`, Agents SDK, all of it — uses that fetch automatically.

For the actual wiring, look at the cache-enabled examples in the repo. Turning
on `markResponseEnabled: true` stamps cached responses with
`x_from_openai_cache: true`, so you can see at a glance which runs were
recomputed and which came out of sqlite.

---

## Lever 4 — Track spend with openai-cost

The flip side of caching is knowing what you spent on the things you *didn't*
cache. Squinting at the OpenAI billing dashboard a week later is not a vibe.

[**openai-cost**](https://github.com/jeromeetienne/openai-cost) records every
call — model, tokens in, tokens out, computed USD cost, and an arbitrary
**bucket id** — into a sqlite database. Bucket ids let you group spending by
feature, script, user, eval suite, or whatever dimension you care about. At any
point, ask for `getSummaryCosts()` and see exactly what each bucket cost.

It's OpenAI-specific in practice — local inference is free, so there's nothing
to price for LM Studio or Ollama runs. But for everything that *does* hit a paid
endpoint, this is the answer to "wait, what did that eval suite cost me?"

It composes at the `fetch` layer too, which is where the pattern starts paying
real dividends: **cost tracker wraps cache wraps global fetch**. The cache
short-circuits the network when it can; the cost tracker still sees every
*request* and notes what it would have cost. That's especially useful before you
uncache an eval and actually start paying — you can see the bill in advance.

The repo's [openai_chat_full.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_full.ts)
example wires all of this together. More on that next.

---

## The grand finale: all four levers, one script

The repo includes a script that exercises every combination of every lever:
[examples/openai_chat_full.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_full.ts).

It runs the same chat completion across every provider (OpenAI, LM Studio,
Ollama, Gemini) crossed with every combination of the two `fetch` wrappers
(with/without `openai-cache`, with/without `openai-cost`). That's 4 providers × 4
wrapper combos = 16 cells. Providers whose env var or local server isn't
available are politely skipped, no fuss.

Run it twice. The second pass flips the cache-enabled cells to `cache:true` and
the latency drops off a cliff. At the end you get a per-bucket cost summary out
of the sqlite tracker. It's the most concise demonstration that all four levers
compose: same client shape, same downstream code, different `fetch` wiring.

---

## Recap

The cost of running OpenAI-API-shaped code isn't a fixed number. It's a choice
between four levers that all attach to the same client:

1. **Local** for the iteration loop. (free)
2. **Cheaper hosted** when you need a real model but not a frontier one.
3. **Cache** so the same prompt only ever costs you once.
4. **Cost ledger** so you actually know what the rest cost.

Pick the cheapest lever that meets your quality bar for any given call. Stack
them when it helps. Watch your token bill not move.

## Further reading

- openai-cache: <https://github.com/jeromeetienne/openai-cache>
- openai-cost: <https://github.com/jeromeetienne/openai-cost>
- LM Studio: <https://lmstudio.ai/>
- Ollama: <https://ollama.com/>
- Gemini's OpenAI-compatible endpoint: <https://ai.google.dev/gemini-api/docs/openai>
- Companion guide: [How to run the OpenAI API on something that isn't OpenAI](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/docs/openai_agents_sdk_providers_howto.article.md)
- The full provider × wrapper matrix runner:
  [examples/openai_chat_full.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_full.ts)
- All runnable examples: <https://github.com/jeromeetienne/openai_api_local/tree/HEAD/examples>
