// npm imports
import { Agent, run } from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';

// local imports
import { UtilsAi } from '../src/libs/utils-ai.js';

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

const openaiClient = UtilsAi.getOpenAiClient({ provider: UtilsAi.PROVIDER.LMSTUDIO });
const model = new OpenAIChatCompletionsModel(openaiClient, modelName);

const agent = new Agent({
	name: 'OctopusBot',
	instructions: 'You answer in a single short sentence.',
	model,
});

const result = await run(agent, 'Say hello and name one fun fact about octopuses.');
console.log(`[model=${modelName}] ${result.finalOutput ?? '(no output)'}`);
