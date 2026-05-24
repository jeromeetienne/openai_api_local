// npm imports
import { OpenAI } from 'openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Basic chat completion against a local Ollama server.
//	Prerequisite: install Ollama, pull a chat model (e.g. `ollama pull llama3.2`),
//	and make sure `ollama serve` is running (the desktop app starts it for you).
//	Override the model with MODEL=<id> npm run example:chat_ollama
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const modelName = process.env.MODEL ?? 'llama3.2:1b';

const openaiClient = new OpenAI({
	baseURL: 'http://localhost:11434/v1',
	apiKey: 'ollama',
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
