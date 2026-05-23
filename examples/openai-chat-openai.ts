// local imports
import { UtilsAi } from '../src/libs/utils-ai.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Basic chat completion against api.openai.com.
//	Requires the OPENAI_API_KEY env var.
//	Override the model with MODEL=gpt-4o npm run example:chat-openai
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'gpt-4o-mini';

const openaiClient = UtilsAi.getOpenAiClient({ provider: UtilsAi.PROVIDER.OPENAI });

const response = await openaiClient.chat.completions.create({
	model: modelName,
	messages: [
		{ role: 'system', content: 'You answer in a single short sentence.' },
		{ role: 'user', content: 'Say hello and name one fun fact about octopuses.' },
	],
});

const reply = response.choices[0]?.message.content ?? '(no content)';
console.log(`[model=${modelName}] ${reply}`);
