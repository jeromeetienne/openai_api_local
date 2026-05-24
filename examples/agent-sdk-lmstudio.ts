// npm imports
import { OpenAI } from 'openai';
import OpenaiAgents from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Minimal @openai/agents run against a local LM Studio server.
//	LM Studio implements /v1/chat/completions but not /v1/responses, so the
//	chat-completions model class is used.
//	Prerequisite: start LM Studio's local server and load a chat model.
//	Override the model with MODEL=<id> npm run example:agent-lmstudio
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'qwen/qwen3-4b';

const openaiClient = new OpenAI({
	baseURL: 'http://localhost:1234/v1',
	apiKey: 'lm-studio',
});
const model = new OpenAIChatCompletionsModel(openaiClient, modelName);

const agent = new OpenaiAgents.Agent({
	name: 'OctopusBot',
	instructions: 'You answer in a single short sentence.',
	model,
});

const result = await OpenaiAgents.run(agent, 'Say hello and name one fun fact about octopuses.');
console.log(`[model=${modelName}] ${result.finalOutput ?? '(no output)'}`);
