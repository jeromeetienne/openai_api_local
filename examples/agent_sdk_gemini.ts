// npm imports
import { OpenAI } from 'openai';
import * as OpenaiAgents from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Minimal @openai/agents run against Google Gemini via its OpenAI-compatible
//	endpoint (https://ai.google.dev/gemini-api/docs/openai).
//	Gemini exposes /v1/chat/completions but not /v1/responses, so the
//	chat-completions model class is used.
//	Requires the GEMINI_API_KEY env var (get one in Google AI Studio).
//	Override the model with MODEL=<id> npm run example:agent_gemini
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'gemini-2.5-flash';

const openaiClient = new OpenAI({
	baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
	apiKey: process.env.GEMINI_API_KEY,
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
