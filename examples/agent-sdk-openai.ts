// npm imports
import { Agent, run } from '@openai/agents';
import { OpenAIResponsesModel } from '@openai/agents-openai';

// local imports
import { UtilsAi } from '../src/libs/utils-ai.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Minimal @openai/agents run against api.openai.com using the Responses API.
//	Requires the OPENAI_API_KEY env var.
//	Override the model with MODEL=gpt-4o npm run example:agent-openai
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'gpt-4o-mini';

const openaiClient = UtilsAi.getOpenAiClient({ provider: UtilsAi.PROVIDER.OPENAI });
const model = new OpenAIResponsesModel(openaiClient, modelName);

const agent = new Agent({
	name: 'OctopusBot',
	instructions: 'You answer in a single short sentence.',
	model,
});

const result = await run(agent, 'Say hello and name one fun fact about octopuses.');
console.log(`[model=${modelName}] ${result.finalOutput ?? '(no output)'}`);
