// npm imports
import { OpenAI } from 'openai';
import OpenaiAgents from '@openai/agents';
import { OpenAIResponsesModel } from '@openai/agents-openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Minimal @openai/agents run against api.openai.com using the Responses API.
//	Requires the OPENAI_API_KEY env var.
//	Override the model with MODEL=gpt-4o npm run example:agent_openai
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'gpt-4o-mini';

const openaiClient = new OpenAI();
const model = new OpenAIResponsesModel(openaiClient, modelName);

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
