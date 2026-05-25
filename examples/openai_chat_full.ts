// node imports
import Path from 'node:path';
import Fs from 'node:fs';

// npm imports
import { OpenAI } from 'openai';
import type { ClientOptions } from 'openai';
import { Cacheable } from 'cacheable';
import OpenAICache from 'openai-cache';
import KeyvSqlite from '@keyv/sqlite';
import OpenAiCost from 'openai-cost';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	"Full matrix" example — runs the same chat completion across every
//	provider (OpenAI, LM Studio, Ollama, Gemini) crossed with every
//	combination of the two fetch wrappers:
//		- with/without openai-cache (sqlite)
//		- with/without openai-cost  (sqlite)
//	→ 4 providers × 4 wrapper combos = 16 cells.
//
//	Run twice to see the cache-enabled cells flip to `cache:true` on run 2.
//	Providers whose env var / local server is unavailable are skipped.
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

type ProviderConfig = {
	name: string;
	clientOptions: ClientOptions;
	defaultModel: string;
	skipReason: string | undefined;
};

type WrapperOption = {
	label: string;
	cache: boolean;
	cost: boolean;
};

const __dirname = Path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = Path.resolve(__dirname, '..');
const OUTPUTS_DIR = Path.resolve(PROJECT_ROOT, 'outputs');
Fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

// ─── shared sqlite resources (one cache file, one cost-tracker file) ────────

const sqliteCachePath = `sqlite://${Path.resolve(OUTPUTS_DIR, '.openai_cache.sqlite')}`;
const sqliteCache = new Cacheable({ secondary: new KeyvSqlite(sqliteCachePath) });
const openaiCache = new OpenAICache(sqliteCache, { markResponseEnabled: true });

const trackerDbPath = Path.resolve(OUTPUTS_DIR, '.openai_cost_tracker.sqlite');
const trackerSqlite = new OpenAiCost.OpenAiCostTrackerSqlite(trackerDbPath);
await trackerSqlite.init();
const trackerCallback = await trackerSqlite.getTrackerCallback();

// ─── providers ──────────────────────────────────────────────────────────────

const openaiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

const providers: ProviderConfig[] = [
	{
		name: 'openai',
		clientOptions: {},
		defaultModel: 'gpt-4o-mini',
		skipReason: openaiKey === undefined ? 'missing OPENAI_API_KEY' : undefined,
	},
	{
		name: 'lmstudio',
		clientOptions: {
			baseURL: 'http://localhost:1234/v1',
			apiKey: 'lm-studio',
		},
		defaultModel: 'liquid/lfm2.5-1.2b',
		skipReason: undefined,
	},
	{
		name: 'ollama',
		clientOptions: {
			baseURL: 'http://localhost:11434/v1',
			apiKey: 'ollama',
		},
		defaultModel: 'llama3.2:1b',
		skipReason: undefined,
	},
	{
		name: 'gemini',
		clientOptions: {
			baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
			apiKey: geminiKey,
		},
		defaultModel: 'gemini-2.5-flash',
		skipReason: geminiKey === undefined ? 'missing GEMINI_API_KEY' : undefined,
	},
];

// allow MODEL_<PROVIDER> overrides (e.g. MODEL_OPENAI=gpt-4o)
for (const provider of providers) {
	const overrideKey = `MODEL_${provider.name.toUpperCase()}`;
	const overrideValue = process.env[overrideKey];
	if (overrideValue !== undefined && overrideValue !== '') {
		provider.defaultModel = overrideValue;
	}
}

// ─── wrapper options (the 2×2) ──────────────────────────────────────────────

const wrapperOptions: WrapperOption[] = [
	{ label: 'bare', cache: false, cost: false },
	{ label: 'cache', cache: true, cost: false },
	{ label: 'cost', cache: false, cost: true },
	{ label: 'cache+cost', cache: true, cost: true },
];

// ─── build a wrapped fetch for a given (provider, option) cell ──────────────

async function buildFetch(provider: ProviderConfig, option: WrapperOption): Promise<typeof fetch | undefined> {
	let composedFetch: typeof fetch | undefined = undefined;

	if (option.cache === true) {
		composedFetch = openaiCache.getFetchFn() as typeof fetch;
	}

	if (option.cost === true) {
		const bucketId = `${provider.name}_${option.label}`;
		composedFetch = (await OpenAiCost.OpenAICallTracker.getFetchFn(
			trackerCallback,
			{
				bucketId,
				originalFetch: composedFetch,
			},
		)) as typeof fetch;
	}

	return composedFetch;
}

// ─── output helpers ─────────────────────────────────────────────────────────

const padRight = (value: string, width: number): string => value.length >= width ? value : value + ' '.repeat(width - value.length);

const formatRow = (
	providerName: string,
	optionLabel: string,
	modelName: string,
	body: string,
): string => {
	return `[${padRight(providerName, 9)}/ ${padRight(optionLabel, 11)}] ${padRight(modelName, 22)} ${body}`;
};

// ─── run the matrix ─────────────────────────────────────────────────────────

const messages = [
	{ role: 'system' as const, content: 'You answer in a single short sentence.' },
	{ role: 'user' as const, content: 'Say hello and name one fun fact about octopuses.' },
];

console.log(`Running ${providers.length} providers × ${wrapperOptions.length} wrapper combos = ${providers.length * wrapperOptions.length} cells.\n`);

for (const provider of providers) {
	if (provider.skipReason !== undefined) {
		console.log(formatRow(provider.name, '-', provider.defaultModel, `skipped (${provider.skipReason})`));
		continue;
	}

	let providerUnreachable = false;
	let providerUnreachableReason = '';

	for (const option of wrapperOptions) {
		if (providerUnreachable === true) {
			console.log(formatRow(provider.name, option.label, provider.defaultModel, `skipped (${providerUnreachableReason})`));
			continue;
		}

		const cellFetch = await buildFetch(provider, option);
		const clientOptions: ClientOptions = { ...provider.clientOptions };
		if (cellFetch !== undefined) {
			clientOptions.fetch = cellFetch;
		}
		const openaiClient = new OpenAI(clientOptions);

		const startedAt = performance.now();
		try {
			const response = await openaiClient.chat.completions.create({
				model: provider.defaultModel,
				messages,
			});
			const inferenceSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);

			const reply = response.choices[0]?.message.content ?? '(no content)';
			const fromCache = (response as unknown as { x_from_openai_cache?: boolean }).x_from_openai_cache === true;
			const replySnippet = reply.replace(/\s+/g, ' ').slice(0, 80);
			console.log(formatRow(
				provider.name,
				option.label,
				provider.defaultModel,
				`${inferenceSeconds}s  cache:${String(fromCache).padEnd(5)} reply: "${replySnippet}"`,
			));
		} catch (caughtError) {
			const error = caughtError as Error & { code?: string };
			const reason = error.code !== undefined ? error.code : error.message.split('\n')[0];
			console.log(formatRow(provider.name, option.label, provider.defaultModel, `error: ${reason}`));
			providerUnreachable = true;
			providerUnreachableReason = `${provider.name} unreachable: ${reason}`;
		}
	}
}

// ─── cost summary ───────────────────────────────────────────────────────────

console.log('\ncost summary (grouped by bucketId):');
const summary = await trackerSqlite.getSummaryCosts();
console.log(JSON.stringify(summary, null, 2));

await trackerSqlite.close();
