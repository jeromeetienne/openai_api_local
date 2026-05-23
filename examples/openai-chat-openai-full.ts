// node imports
import Path from 'node:path';
import Fs from 'node:fs';

// npm imports
import { OpenAI } from 'openai';
import { Cacheable } from 'cacheable';
import OpenAICache from 'openai-cache';
import KeyvSqlite from '@keyv/sqlite';
import { OpenAICallTracker, OpenAiCostTrackerSqlite } from 'openai-cost';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	"Full" example — same basic chat completion, but the OpenAI client's fetch
//	is wrapped with openai-cache (sqlite-backed) and openai-cost (sqlite-backed
//	cost tracking). Run twice to see the second run answer from cache.
//	Requires OPENAI_API_KEY.
//	Override the model with MODEL=gpt-4o npm run example:chat-openai-full
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const __dirname = Path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = Path.resolve(__dirname, '..');
const OUTPUTS_DIR = Path.resolve(PROJECT_ROOT, 'outputs');
Fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

const modelName = process.env.MODEL ?? 'gpt-4o-mini';
const bucketId = 'example_chat_openai_full';

// 1. cache backed by sqlite
const sqliteCachePath = `sqlite://${Path.resolve(OUTPUTS_DIR, '.openai_cache.sqlite')}`;
const sqliteCache = new Cacheable({ secondary: new KeyvSqlite(sqliteCachePath) });
const openaiCache = new OpenAICache(sqliteCache, { markResponseEnabled: true });

// 2. cost tracker backed by sqlite
const trackerDbPath = Path.resolve(OUTPUTS_DIR, '.openai_cost_tracker.sqlite');
const trackerSqlite = new OpenAiCostTrackerSqlite(trackerDbPath);
await trackerSqlite.init();

// 3. compose: cost-tracker fetch wraps cache fetch wraps global fetch
const fetchWithTracking = await OpenAICallTracker.getFetchFn(
	await trackerSqlite.getTrackerCallback(),
	{
		bucketId,
		originalFetch: openaiCache.getFetchFn(),
	},
);

const openaiClient = new OpenAI({ fetch: fetchWithTracking });

const response = await openaiClient.chat.completions.create({
	model: modelName,
	messages: [
		{ role: 'system', content: 'You answer in a single short sentence.' },
		{ role: 'user', content: 'Say hello and name one fun fact about octopuses.' },
	],
});

const reply = response.choices[0]?.message.content ?? '(no content)';
const fromCache = (response as unknown as { x_from_openai_cache?: boolean }).x_from_openai_cache === true;
console.log(`[model=${modelName}] ${reply}`);
console.log(`(served from cache: ${fromCache})`);

const summary = await trackerSqlite.getSummaryCosts();
console.log('cost summary:', JSON.stringify(summary, null, 2));

await trackerSqlite.close();
