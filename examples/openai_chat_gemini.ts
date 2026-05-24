// npm imports
import { OpenAI } from 'openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Basic chat completion against Google Gemini via its OpenAI-compatible
//	endpoint (https://ai.google.dev/gemini-api/docs/openai).
//	Requires the GEMINI_API_KEY env var (get one in Google AI Studio).
//	Override the model with MODEL=<id> npm run example:chat_gemini
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'gemini-2.5-flash';

const openaiClient = new OpenAI({
	baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
	apiKey: process.env.GEMINI_API_KEY,
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
