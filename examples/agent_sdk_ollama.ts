// npm imports
import { OpenAI } from 'openai';
import * as OpenaiAgents from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Minimal @openai/agents run against a local Ollama server.
//	Ollama implements /v1/chat/completions but not /v1/responses, so the
//	chat-completions model class is used.
//	Prerequisite: install Ollama, pull a chat model (e.g. `ollama pull llama3.2`),
//	and make sure `ollama serve` is running.
//	Override the model with MODEL=<id> npm run example:agent_ollama
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'llama3.2:1b';

const openaiClient = new OpenAI({
	baseURL: 'http://localhost:11434/v1',
	apiKey: 'ollama',
});
const model = new OpenAIChatCompletionsModel(openaiClient, modelName);

const agent = new OpenaiAgents.Agent({
	name: 'OctopusBot',
	instructions: 'You answer in a single short sentence.',
	model,
});

const startedAt = performance.now();
const result = await OpenaiAgents.run(agent, 'Say hello and name one fun fact about octopuses.');
const inferenceSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);

console.log(`[model=${modelName}] ${result.finalOutput ?? '(no output)'}`);
console.log(`(inference: ${inferenceSeconds}s)`);
