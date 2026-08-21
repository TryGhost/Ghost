import type {Model} from '@earendil-works/pi-ai';

export type BuilderProvider = 'openai' | 'openai-codex' | 'anthropic';
export type CuratedModel = Model<'openai-responses' | 'openai-codex-responses' | 'anthropic-messages'> & {
    provider: BuilderProvider;
};

// Verified against the generated model catalogs shipped by pi-ai 0.84.2.
const codexModels: readonly CuratedModel[] = [
    {
        id: 'gpt-5.6-sol',
        name: 'GPT-5.6 Sol',
        api: 'openai-codex-responses',
        provider: 'openai-codex',
        baseUrl: 'https://chatgpt.com/backend-api',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25, tiers: [{inputTokensAbove: 272000, input: 10, output: 45, cacheRead: 1, cacheWrite: 12.5}]},
        contextWindow: 272000,
        maxTokens: 128000,
        thinkingLevelMap: {xhigh: 'xhigh', max: 'max', minimal: 'low'},
        compat: {supportsOpenAIGrammarTools: true, supportsAdditionalTools: true, supportsToolSearch: true}
    },
    {
        id: 'gpt-5.6-terra',
        name: 'GPT-5.6 Terra',
        api: 'openai-codex-responses',
        provider: 'openai-codex',
        baseUrl: 'https://chatgpt.com/backend-api',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 2, output: 12, cacheRead: 0.2, cacheWrite: 2.5, tiers: [{inputTokensAbove: 272000, input: 4, output: 18, cacheRead: 0.4, cacheWrite: 5}]},
        contextWindow: 272000,
        maxTokens: 128000,
        thinkingLevelMap: {xhigh: 'xhigh', max: 'max', minimal: 'low'},
        compat: {supportsOpenAIGrammarTools: true, supportsAdditionalTools: true, supportsToolSearch: true}
    },
    {
        id: 'gpt-5.6-luna',
        name: 'GPT-5.6 Luna',
        api: 'openai-codex-responses',
        provider: 'openai-codex',
        baseUrl: 'https://chatgpt.com/backend-api',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 0.2, output: 1.2, cacheRead: 0.02, cacheWrite: 0.25, tiers: [{inputTokensAbove: 272000, input: 0.4, output: 1.8, cacheRead: 0.04, cacheWrite: 0.5}]},
        contextWindow: 272000,
        maxTokens: 128000,
        thinkingLevelMap: {xhigh: 'xhigh', max: 'max', minimal: 'low'},
        compat: {supportsOpenAIGrammarTools: true, supportsAdditionalTools: true, supportsToolSearch: true}
    }
];

export const CURATED_MODELS: readonly CuratedModel[] = [
    {
        id: 'gpt-5.6-sol',
        name: 'GPT-5.6 Sol',
        api: 'openai-responses',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25},
        contextWindow: 272000,
        maxTokens: 128000,
        thinkingLevelMap: {off: 'none', minimal: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max'},
        compat: {supportsStrictMode: true, supportsOpenAIGrammarTools: true, supportsAdditionalTools: true, supportsToolSearch: true, supportsExplicitPromptCacheMode: true}
    },
    {
        id: 'gpt-5.6-terra',
        name: 'GPT-5.6 Terra',
        api: 'openai-responses',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 2, output: 12, cacheRead: 0.2, cacheWrite: 2.5},
        contextWindow: 272000,
        maxTokens: 128000,
        thinkingLevelMap: {off: 'none', minimal: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max'},
        compat: {supportsStrictMode: true, supportsOpenAIGrammarTools: true, supportsAdditionalTools: true, supportsToolSearch: true, supportsExplicitPromptCacheMode: true}
    },
    {
        id: 'gpt-5.6-luna',
        name: 'GPT-5.6 Luna',
        api: 'openai-responses',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 0.2, output: 1.2, cacheRead: 0.02, cacheWrite: 0.25},
        contextWindow: 272000,
        maxTokens: 128000,
        thinkingLevelMap: {off: 'none', minimal: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max'},
        compat: {supportsStrictMode: true, supportsOpenAIGrammarTools: true, supportsAdditionalTools: true, supportsToolSearch: true, supportsExplicitPromptCacheMode: true}
    },
    ...(import.meta.env.DEV ? codexModels : []),
    {
        id: 'claude-sonnet-5',
        name: 'Claude Sonnet 5',
        api: 'anthropic-messages',
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5},
        contextWindow: 1000000,
        maxTokens: 128000,
        thinkingLevelMap: {xhigh: 'xhigh', max: 'max'},
        compat: {forceAdaptiveThinking: true, supportsStrictTools: true}
    },
    {
        id: 'claude-opus-5',
        name: 'Claude Opus 5',
        api: 'anthropic-messages',
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25},
        contextWindow: 1000000,
        maxTokens: 128000,
        thinkingLevelMap: {xhigh: 'xhigh', max: 'max'},
        compat: {forceAdaptiveThinking: true, supportsTemperature: false, supportsStrictTools: true}
    },
    {
        id: 'claude-fable-5',
        name: 'Claude Fable 5',
        api: 'anthropic-messages',
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        reasoning: true,
        input: ['text', 'image'],
        cost: {input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5},
        contextWindow: 1000000,
        maxTokens: 128000,
        thinkingLevelMap: {off: null, xhigh: 'xhigh', max: 'max'},
        compat: {forceAdaptiveThinking: true, supportsStrictTools: true}
    }
] as const;

function providerName(provider: BuilderProvider): string {
    if (provider === 'openai') {
        return 'OpenAI';
    }
    return provider === 'openai-codex' ? 'Codex' : 'Anthropic';
}

export function findCuratedModel(provider: BuilderProvider, modelId: string): CuratedModel {
    const model = CURATED_MODELS.find(item => item.provider === provider && item.id === modelId);

    if (!model) {
        throw new Error(`Unsupported ${providerName(provider)} model: ${modelId}`);
    }

    return model;
}
