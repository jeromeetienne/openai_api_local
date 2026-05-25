# How to run the OpenAI API on something that isn't OpenAI

The OpenAI HTTP protocol has quietly become the QWERTY of LLMs. Nobody voted on it,
nobody sat down and standardized it, and yet here we are: half the model servers on
the planet speak it. Which means once your code knows how to talk to
`api.openai.com`, it also knows how to talk to a model running on your laptop, a
model running on someone else's laptop, or a model running on a Google data center —
without you rewriting a single line of business logic.

This guide is the tourist brochure for that idea. We'll point your client at
[LM Studio](https://lmstudio.ai/) (local, with a friendly GUI),
[Ollama](https://ollama.com/) (local, gloriously command-line), and
[Google Gemini](https://ai.google.dev/gemini-api/docs/openai) (hosted, but
politely OpenAI-shaped). All the runnable code lives in the
[openai_api_local](https://github.com/jeromeetienne/openai_api_local) repo —
when you want the actual TypeScript, click through. Here we'll keep it short.

> Want to *spend less money* doing this? See the companion guide:
> [How to control OpenAI API costs](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/docs/openai_api_cost_control_howto.article.md).

---

## Why would anyone do this?

A few reasons, in roughly increasing order of "your CFO will be happy":

- **Iteration speed.** No round-trip across the public internet. A small model on a
  modern laptop answers in well under a second. You stop waiting; you start
  iterating.
- **Cost.** Local inference is free. Rerun the same prompt two hundred times while
  you tweak surrounding code? Still free. Even cheaper hosted providers like Gemini
  drop the bill noticeably.
- **Privacy.** Whatever you send a local model stays on your laptop. Proprietary
  code, customer data, draft poetry you're not ready to share — none of it leaves
  the building.
- **Offline.** Trains, planes, conference Wi-Fi captive portals from 2008 — none of
  those can stop a model that lives at `localhost`.

Yes, a 4B local model is not GPT-4o. But for the unglamorous 80% of agent work —
wiring up tools, writing instructions, shaping outputs, building evals — you don't
need a frontier model. You need a model that answers fast enough that you don't
lose your train of thought.

---

## The one trap, declared loudly

OpenAI's hosted API has two endpoints that can run an agent:

- `/v1/chat/completions` — the old, ubiquitous one. Every OpenAI-compatible server
  in the wild implements it.
- `/v1/responses` — OpenAI's newer, stateful API. Only OpenAI implements it.

**LM Studio, Ollama, and Gemini all speak `/v1/chat/completions` but NOT
`/v1/responses`.**

That's the whole catch. In the Agents SDK that means swapping one class:
`OpenAIChatCompletionsModel` instead of `OpenAIResponsesModel`. Forget, and the
server greets you with a polite `404`. Remember, and everything else stays the
same.

If you're calling `openaiClient.chat.completions.create()` directly (no Agents SDK),
this trap doesn't even apply. There's no class to swap. Just change `baseURL` and
`apiKey` and go.

---

## The whole setup, in three bullet points

For all three providers, the recipe is the same:

1. Make sure the server is running.
2. Point an `OpenAI` client at it (different URL, different key).
3. Use it like you always do.

That's the article, really. Here's how step 1 plays out per provider:

**LM Studio** — install [LM Studio](https://lmstudio.ai/), run `lms server start`,
load any chat model from the UI. The server lives at `http://localhost:1234`.

**Ollama** — install [Ollama](https://ollama.com/), `ollama pull llama3.2:1b`, and
the desktop app starts the server for you at `http://localhost:11434`.

**Gemini** — grab a key from [Google AI Studio](https://aistudio.google.com/apikey),
`export GEMINI_API_KEY=...`, point your client at
`https://generativelanguage.googleapis.com/v1beta/openai/`. No installation; it's
just a URL.

That is genuinely the entire setup. The "how do I write the client" part is a
five-line file. Here are the two LM Studio variants in full — every other provider
is the same shape, with a different URL and key.

**Plain `chat.completions`** ([openai_chat_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_lmstudio.ts)):

```ts
import { OpenAI } from 'openai';

const openaiClient = new OpenAI({
        baseURL: 'http://localhost:1234/v1',
        apiKey: 'lm-studio',
});

const response = await openaiClient.chat.completions.create({
        model: 'liquid/lfm2.5-1.2b',
        messages: [
                { role: 'user', content: 'Say hello and name one fun fact about octopuses.' },
        ],
});
console.log(response.choices[0]?.message.content);
```

**Agents SDK** ([agent_sdk_lmstudio.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_lmstudio.ts)):

```ts
import { OpenAI } from 'openai';
import OpenaiAgents from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';

const openaiClient = new OpenAI({
        baseURL: 'http://localhost:1234/v1',
        apiKey: 'lm-studio',
});
const model = new OpenAIChatCompletionsModel(openaiClient, 'liquid/lfm2.5-1.2b');

const agent = new OpenaiAgents.Agent({
        name: 'OctopusBot',
        instructions: 'You answer in a single short sentence.',
        model,
});

const result = await OpenaiAgents.run(agent, 'Say hello and name one fun fact about octopuses.');
console.log(result.finalOutput);
```

That's the trap from earlier, made concrete: the Agents SDK version wraps the
client in `OpenAIChatCompletionsModel` (not `OpenAIResponsesModel`). Drop that one
line and a 404 is your reward.

The rest of the runnable variants live in the repo:

- Agents SDK: [agent_sdk_openai.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_openai.ts),
  [agent_sdk_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_ollama.ts),
  [agent_sdk_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/agent_sdk_gemini.ts)
- Plain `chat.completions`: [openai_chat_openai.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_openai.ts),
  [openai_chat_ollama.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_ollama.ts),
  [openai_chat_gemini.ts](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/examples/openai_chat_gemini.ts)

Diff any two of those files side-by-side. The only things that change are the URL,
the API key, and (for the Agents SDK) the model class. That's the entire moral of
the story, distilled to a `git diff`.

---

## What still works when you go local

Surprisingly, most of the SDK. Specifically:

- **Agents and instructions** — `new Agent({ name, instructions, model })` doesn't
  care what `model` points at.
- **Tools** — function calling works as long as the local model was trained for it.
  Llama 3.1+, Qwen 2.5+, Mistral, and most modern chat models do. Smaller models
  (1B–3B) can be flaky callers; if your agent stops invoking tools, try a bigger
  model before blaming your prompt.
- **Structured outputs** — pass a Zod schema as `outputType` and you get validated
  JSON back. Most local backends translate this to grammar-constrained decoding,
  which is fast and reliable.
- **Handoffs** — agent-to-agent handoffs are SDK-orchestrated, so they just work.
- **`OpenaiAgents.run()`** — the runner, retries, and turn loop are all SDK-side,
  not server-side. The server just answers prompts.

## What doesn't (and why that's fine)

- **OpenAI's hosted tools** (web search, file search, code interpreter, computer
  use) are Responses-API features and don't exist outside OpenAI. You can rebuild
  any of them as a regular function tool — just don't expect the SDK's built-in
  handles to work against a local backend.
- **OpenAI's hosted tracing dashboard** doesn't see local runs. Console logs,
  `AGENTS_SDK_DEBUG`, or your own sink are the fallbacks.
- **Frontier reasoning** — a 1B model is a 1B model. Develop locally for the
  wiring, switch back to `OpenAIResponsesModel` (or any frontier adapter) for the
  runs that decide things.

---

## Two tricks worth knowing

**Pick the model from the command line.** Every example in the repo respects a
`MODEL=<id>` env var, so you can A/B a prompt across backends in an afternoon:

```sh
MODEL=qwen/qwen3-8b   npm run example:agent_lmstudio
MODEL=qwen3:4b        npm run example:agent_ollama
MODEL=gemini-2.5-pro  npm run example:agent_gemini
MODEL=gpt-4o          npm run example:agent_openai
```

**When things go silent, curl the backend.** If `npm run` hangs or 404s, the
server is the first suspect:

```sh
curl http://localhost:1234/v1/models           # LM Studio
curl http://localhost:11434/v1/models          # Ollama
curl https://generativelanguage.googleapis.com/v1beta/openai/models \
        -H "Authorization: Bearer $GEMINI_API_KEY"   # Gemini
```

If the local ones return nothing, the server isn't running. If Gemini returns a
`401`/`403`, your API key isn't what you think it is.

---

## The whole pitch, one paragraph

Point an `OpenAI` client at a different URL. If you're on the Agents SDK and the
URL isn't OpenAI's, swap `OpenAIResponsesModel` for `OpenAIChatCompletionsModel`.
The rest of your code — agents, tools, handoffs, structured outputs, `run()` —
doesn't change. The model becomes a configuration line, not an architectural
decision. Try the same prompt on four different models this afternoon. It'll take
you longer to pick which models than to wire them up.

## Further reading

- OpenAI Agents JS SDK: <https://openai.github.io/openai-agents-js/>
- OpenAI Agents JS on GitHub: <https://github.com/openai/openai-agents-js>
- OpenAI's official agents guide: <https://developers.openai.com/api/docs/guides/agents>
- LM Studio: <https://lmstudio.ai/>
- Ollama: <https://ollama.com/>
- Gemini's OpenAI-compatible endpoint: <https://ai.google.dev/gemini-api/docs/openai>
- Companion guide: [How to control OpenAI API costs](https://github.com/jeromeetienne/openai_api_local/blob/HEAD/docs/openai_api_cost_control_howto.article.md)
- All runnable examples: <https://github.com/jeromeetienne/openai_api_local/tree/HEAD/examples>
