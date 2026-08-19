import {anthropicMessagesApi} from '@earendil-works/pi-ai/api/anthropic-messages.lazy';
import {openAIResponsesApi} from '@earendil-works/pi-ai/api/openai-responses.lazy';

import type {FetchFunction, ProviderStreams} from '@earendil-works/pi-ai';
import {createAgentRuntime} from '@/builder/core/agent-runtime';
import {findCuratedModel} from '@/builder/models/curated-models';

import type {AgentRuntime, BuilderRuntimeEvent, BuilderTool} from '@/builder/core/agent-runtime';
import type {BuilderProvider} from '@/builder/models/curated-models';

type BrowserPiModelAccessOptions = {
    getApiKey: (provider: BuilderProvider) => string | undefined;
    fetch?: FetchFunction;
};

type CreateRuntimeOptions = {
    provider: BuilderProvider;
    modelId: string;
    systemPrompt?: string;
    tools?: BuilderTool[];
    maxMessages?: number;
    onEvent?: (event: BuilderRuntimeEvent) => void;
};

function apiForProvider(provider: BuilderProvider): ProviderStreams {
    return provider === 'openai' ? openAIResponsesApi() : anthropicMessagesApi();
}

function providerName(provider: BuilderProvider): string {
    return provider === 'openai' ? 'OpenAI' : 'Anthropic';
}

export class BrowserPiModelAccess {
    static readonly runtime = 'pi';

    private readonly getApiKey: BrowserPiModelAccessOptions['getApiKey'];
    private readonly fetch?: FetchFunction;

    constructor({getApiKey, fetch}: BrowserPiModelAccessOptions) {
        this.getApiKey = getApiKey;
        this.fetch = fetch;
    }

    createRuntime({provider, modelId, ...options}: CreateRuntimeOptions): AgentRuntime {
        if (provider !== 'openai' && provider !== 'anthropic') {
            throw new Error(`Unsupported provider: ${String(provider)}`);
        }

        const model = findCuratedModel(provider, modelId);
        const apiKey = this.getApiKey(provider);
        if (!apiKey) {
            throw new Error(`Add an ${providerName(provider)} API key before starting a turn.`);
        }

        const providerApi = apiForProvider(provider);
        return createAgentRuntime({
            ...options,
            model,
            getApiKey: () => this.getApiKey(provider),
            streamFn: (activeModel, context, streamOptions) => providerApi.streamSimple(activeModel, context, {
                ...streamOptions,
                fetch: this.fetch
            })
        });
    }
}
