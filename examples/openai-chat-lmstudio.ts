// local imports
import { UtilsAi } from '../src/libs/utils-ai.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Basic chat completion against a local LM Studio server.
//	Prerequisite: start LM Studio's local server and load a chat model.
//	Override the model with MODEL=<id> npm run example:chat-lmstudio
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'qwen/qwen3-4b';

const openaiClient = UtilsAi.getOpenAiClient({ provider: UtilsAi.PROVIDER.LMSTUDIO });

const response = await openaiClient.chat.completions.create({
	model: modelName,
	messages: [
		{ role: 'system', content: 'You answer in a single short sentence.' },
		{ role: 'user', content: 'Say hello and name one fun fact about octopuses.' },
	],
});

const reply = response.choices[0]?.message.content ?? '(no content)';
console.log(`[model=${modelName}] ${reply}`);
