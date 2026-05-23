// npm imports
import { OpenAI } from 'openai';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	UtilsAi
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export type UtilsAiProvider = 'openai' | 'lmstudio';

export class UtilsAi {
	static PROVIDER = {
		OPENAI: 'openai' as UtilsAiProvider,
		LMSTUDIO: 'lmstudio' as UtilsAiProvider,
	};

	static LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';

	/**
	 * Guess which provider a model name belongs to.
	 * - 'gpt-*' and 'o*' families  → openai
	 * - anything namespaced (e.g. 'qwen/qwen3-4b', 'liquid/lfm2-1.2b') → lmstudio
	 */
	static providerFromModelName(modelName: string): UtilsAiProvider {
		if (modelName.startsWith('gpt-') || /^o\d/.test(modelName)) {
			return UtilsAi.PROVIDER.OPENAI;
		}
		return UtilsAi.PROVIDER.LMSTUDIO;
	}

	/**
	 * Build an OpenAI client wired to either api.openai.com or a local
	 * LM Studio server (which speaks the same OpenAI-compatible API).
	 */
	static getOpenAiClient({
		provider = UtilsAi.PROVIDER.OPENAI,
		baseURL,
	}: {
		provider?: UtilsAiProvider;
		baseURL?: string;
	} = {}): OpenAI {
		if (provider === UtilsAi.PROVIDER.OPENAI) {
			return new OpenAI();
		}
		if (provider === UtilsAi.PROVIDER.LMSTUDIO) {
			return new OpenAI({
				baseURL: baseURL ?? UtilsAi.LMSTUDIO_BASE_URL,
				apiKey: 'lm-studio',
			});
		}
		throw new Error(`Unsupported provider: ${provider}`);
	}
}
