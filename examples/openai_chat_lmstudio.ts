// npm imports
import { OpenAI } from 'openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Basic chat completion against a local LM Studio server.
//	Prerequisite: start LM Studio's local server and load a chat model.
//	Override the model with MODEL=<id> npm run example:chat_lmstudio
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'liquid/lfm2.5-1.2b';

const openaiClient = new OpenAI({
	baseURL: 'http://localhost:1234/v1',
	apiKey: 'lm-studio',
});

const startedAt = performance.now();
const response = await openaiClient.chat.completions.create({
	model: modelName,
	messages: [
		{ role: 'system', content: 'You answer in a single short sentence.' },
		{ role: 'user', content: 'Say hello and name one fun fact about octopuses.' },
	],
});
const inferenceSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);

const reply = response.choices[0]?.message.content ?? '(no content)';
console.log(`[model=${modelName}] ${reply}`);
console.log(`(inference: ${inferenceSeconds}s)`);
