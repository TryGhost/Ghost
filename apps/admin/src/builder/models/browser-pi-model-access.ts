import {anthropicMessagesApi} from '@earendil-works/pi-ai/api/anthropic-messages.lazy';
import {openAIResponsesApi} from '@earendil-works/pi-ai/api/openai-responses.lazy';

import type {FetchFunction, ProviderStreams} from '@earendil-works/pi-ai';
import {createAgentRuntime} from '@/builder/core/agent-runtime';
import {findCuratedModel} from '@/builder/models/curated-models';
import {SessionCredentialStore} from '@/builder/models/session-credential-store';

import type {AgentRuntime, BuilderRuntimeEvent, BuilderRuntimePromptMessage, BuilderTool} from '@/builder/core/agent-runtime';
import type {BuilderConversationMessage, BuilderModelTurnRequest, BuilderStreamEvent, ModelAccessAdapter} from '@/builder/core/model-access';
import type {BuilderToolAttachment, BuilderToolResult} from '@/builder/core/tool-types';
import type {BuilderProvider} from '@/builder/models/curated-models';
import type {BuilderCredentialStore} from '@/builder/models/session-credential-store';

type BrowserPiModelAccessOptions = {
    credentialStore?: BuilderCredentialStore;
    getApiKey?: (provider: BuilderProvider) => string | undefined;
    provider?: BuilderProvider;
    modelId?: string;
    fetch?: FetchFunction;
    maxMessages?: number;
    maxHistoryCharacters?: number;
};

type CreateRuntimeOptions = {
    provider: BuilderProvider;
    modelId: string;
    systemPrompt?: string;
    initialMessages?: readonly BuilderRuntimePromptMessage[];
    tools?: BuilderTool[];
    maxMessages?: number;
    maxCharacters?: number;
    onEvent?: (event: BuilderRuntimeEvent) => void;
};

const promptLimit = 12_000;
const userMessageLimit = 32_000;
const defaultHistoryCharacterLimit = 64_000;
const historyMessageLimit = 12_000;

function apiForProvider(provider: BuilderProvider): ProviderStreams {
    return provider === 'openai' ? openAIResponsesApi() : anthropicMessagesApi();
}

function providerName(provider: BuilderProvider): string {
    return provider === 'openai' ? 'OpenAI' : 'Anthropic';
}

function stringifyBounded(value: unknown, limit = 4_000): {text: string; truncated: boolean} {
    try {
        const text = JSON.stringify(value);
        if (typeof text !== 'string') {
            return {text: 'unavailable', truncated: false};
        }
        return text.length <= limit ? {text, truncated: false} : {
            text: JSON.stringify({truncated: true, preview: text.slice(0, Math.max(0, limit - 40))}),
            truncated: true
        };
    } catch {
        return {text: 'unavailable', truncated: false};
    }
}

export function assembleBuilderSystemPrompt(request: Pick<BuilderModelTurnRequest, 'workspace' | 'tools'>): string {
    const tools = request.tools.map(tool => `- ${tool.name}: ${tool.description.slice(0, 240)}`).join('\n');
    const selection = request.workspace.selection ? stringifyBounded(request.workspace.selection).text : 'none';
    const prompt = [
        'You are the Ghost Builder agent. Work only through the supplied canonical tools.',
        `Workspace: ${request.workspace.title} (${request.workspace.kind}, id ${request.workspace.id}, revision ${request.workspace.revision}).`,
        `Current selection: ${selection}.`,
        'Available tools:',
        tools || '- none',
        'Tool results use a canonical JSON envelope. If a result is not ok, use its code, diagnostics, and current revision to repair the candidate before continuing.',
        'For CSS changes, edit the stylesheet referenced by the rendered theme (commonly assets/built/*.css). Theme build scripts do not run in this browser session; authored assets/css files may not affect the preview.',
        'Mutations update only the session candidate. Only the user can publish; never claim that normal model completion published changes.'
    ].join('\n');
    return prompt.slice(0, promptLimit - 1);
}

function isBuilderToolResult(value: unknown): value is BuilderToolResult<unknown> {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const result = value as Record<string, unknown>;
    if (typeof result.ok !== 'boolean' || typeof result.revision !== 'string') {
        return false;
    }
    if (result.ok) {
        return 'data' in result;
    }
    const error = result.error as Record<string, unknown> | undefined;
    return Boolean(error && typeof error.code === 'string' && typeof error.message === 'string' && typeof error.retryable === 'boolean');
}

function modelToolText(result: BuilderToolResult<unknown>): string {
    const serializable = result.ok && result.attachments ? {
        ...result,
        attachments: result.attachments.map(({type, mediaType}) => ({type, mediaType, data: '[attached image]'}))
    } : result;
    const serialized = stringifyBounded(serializable, 24_000);
    if (!serialized.truncated) {
        return serialized.text;
    }
    return JSON.stringify({
        ok: false,
        revision: result.revision,
        error: {
            code: 'tool_result_too_large',
            message: 'The tool result exceeded the model context limit. Request a narrower result.',
            retryable: true
        }
    });
}

function clippedText(text: string, limit: number): string {
    if (text.length <= limit) {
        return text;
    }
    const marker = '\n[History truncated]';
    if (limit <= marker.length) {
        return text.slice(0, Math.max(0, limit));
    }
    return `${text.slice(0, Math.max(0, limit - marker.length))}${marker}`;
}

function historyToolResult(result: BuilderToolResult<unknown> | undefined): string {
    if (!result) {
        return 'none';
    }
    const serializable = result.ok && result.attachments ? {
        ...result,
        attachments: result.attachments.map(({type, mediaType}) => ({type, mediaType, data: '[image omitted from history]'}))
    } : result;
    return stringifyBounded(serializable, 2_000).text;
}

function projectConversationMessage(message: BuilderConversationMessage): BuilderRuntimePromptMessage {
    const sections = message.text ? [message.text] : [];
    if (message.role === 'assistant' && message.toolCalls?.length) {
        const tools = message.toolCalls.map(toolCall => [
            `${toolCall.name} (${toolCall.status})`,
            `input=${stringifyBounded(toolCall.input, 1_000).text}`,
            `result=${historyToolResult(toolCall.result)}`
        ].join(' '));
        sections.push(`[Builder tool activity]\n${tools.join('\n')}`);
    }
    if (message.status === 'interrupted') {
        sections.push('[This assistant response was interrupted by the user and may be incomplete.]');
    }
    return {role: message.role, text: clippedText(sections.join('\n\n'), historyMessageLimit)};
}

function boundedTurn(turn: readonly BuilderRuntimePromptMessage[], limit: number): BuilderRuntimePromptMessage[] {
    let remaining = limit;
    return turn.map((message, index) => {
        const messagesLeft = turn.length - index;
        const allowance = Math.max(1, Math.floor(remaining / messagesLeft));
        const text = clippedText(message.text, allowance);
        remaining -= text.length;
        return {...message, text};
    });
}

export function projectBuilderConversation(messages: readonly BuilderConversationMessage[], maxCharacters = defaultHistoryCharacterLimit): BuilderRuntimePromptMessage[] {
    const limit = Math.max(1, Math.floor(maxCharacters));
    const turns: BuilderRuntimePromptMessage[][] = [];
    messages.forEach((message) => {
        const projected = projectConversationMessage(message);
        if (message.role === 'user' || !turns.length) {
            turns.push([projected]);
        } else {
            turns.at(-1)?.push(projected);
        }
    });

    const selected: BuilderRuntimePromptMessage[][] = [];
    let used = 0;
    for (let index = turns.length - 1; index >= 0; index -= 1) {
        const turn = turns[index];
        if (!turn) {
            continue;
        }
        const turnCharacters = turn.reduce((total, message) => total + message.text.length, 0);
        if (!selected.length && turnCharacters > limit) {
            selected.unshift(boundedTurn(turn, limit));
            break;
        }
        if (used + turnCharacters > limit) {
            break;
        }
        selected.unshift(turn);
        used += turnCharacters;
    }
    return selected.flat();
}

function toRuntimeTool(tool: BuilderModelTurnRequest['tools'][number]): BuilderTool {
    return {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (input, signal) => {
            const result = await tool.execute(input, signal);
            return {
                text: modelToolText(result),
                details: result,
                attachments: result.ok ? result.attachments?.map((attachment: BuilderToolAttachment) => ({
                    type: attachment.type,
                    mediaType: attachment.mediaType,
                    data: attachment.data
                })) : undefined
            };
        }
    };
}

function toStreamEvent(event: BuilderRuntimeEvent): BuilderStreamEvent | undefined {
    if (event.type === 'assistant-text-delta' || event.type === 'tool-start' || event.type === 'run-error' || event.type === 'run-aborted' || event.type === 'run-end') {
        return event;
    }
    if (event.type === 'tool-end') {
        const result = event.result.details;
        if (isBuilderToolResult(result)) {
            return {type: 'tool-end', callId: event.callId, name: event.name, result};
        }
        return {
            type: 'tool-end',
            callId: event.callId,
            name: event.name,
            result: {
                ok: false,
                revision: '',
                error: {
                    code: 'invalid_tool_result',
                    message: 'The tool returned an invalid Builder result.',
                    retryable: false
                }
            }
        };
    }
    return undefined;
}

function redact(message: string, credentials: readonly string[]): string {
    let redacted = message
        .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
        .replace(/(api[-_ ]?key["'\s:=]+)[^\s,"'}]+/gi, '$1[redacted]');
    credentials.filter(Boolean).forEach((credential) => {
        redacted = redacted.split(credential).join('[redacted]');
    });
    return redacted;
}

export class BrowserPiModelAccess implements ModelAccessAdapter {
    static readonly runtime = 'pi';

    private readonly credentialStore: BuilderCredentialStore;
    private readonly getApiKeyOverride?: BrowserPiModelAccessOptions['getApiKey'];
    private readonly fetch?: FetchFunction;
    private readonly maxMessages: number;
    private readonly maxHistoryCharacters: number;
    private provider: BuilderProvider;
    private modelId: string;

    constructor({credentialStore = new SessionCredentialStore(), getApiKey, provider = 'openai', modelId = 'gpt-5.6-sol', fetch, maxMessages = 80, maxHistoryCharacters = defaultHistoryCharacterLimit}: BrowserPiModelAccessOptions = {}) {
        this.credentialStore = credentialStore;
        this.getApiKeyOverride = getApiKey;
        this.provider = provider;
        this.modelId = modelId;
        this.fetch = fetch;
        this.maxMessages = maxMessages;
        this.maxHistoryCharacters = maxHistoryCharacters;
        findCuratedModel(provider, modelId);
    }

    selectModel(provider: BuilderProvider, modelId: string): void {
        findCuratedModel(provider, modelId);
        this.provider = provider;
        this.modelId = modelId;
    }

    setApiKey(provider: BuilderProvider, credential: string): void {
        this.credentialStore.set(provider, credential);
    }

    hasApiKey(provider: BuilderProvider): boolean {
        return Boolean(this.getApiKey(provider));
    }

    forgetApiKey(provider: BuilderProvider): void {
        this.credentialStore.forget(provider);
    }

    clearCredentials(): void {
        this.credentialStore.clear();
    }

    createRuntime({provider, modelId, onEvent = () => {}, ...options}: CreateRuntimeOptions): AgentRuntime {
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
            }),
            onEvent: (event) => {
                if (event.type === 'run-error') {
                    onEvent({...event, message: redact(event.message, [apiKey, this.getApiKey(provider) ?? ''])});
                } else {
                    onEvent(event);
                }
            }
        });
    }

    async runTurn(request: BuilderModelTurnRequest): Promise<void> {
        if (request.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        const latestMessage = request.messages.at(-1);
        if (!latestMessage || latestMessage.role !== 'user') {
            throw new Error('A Builder model turn must end with a user message.');
        }
        if (latestMessage.text.length > userMessageLimit) {
            throw new Error('A Builder message must be 32,000 characters or fewer.');
        }

        const runtime = this.createRuntime({
            provider: this.provider,
            modelId: this.modelId,
            systemPrompt: assembleBuilderSystemPrompt(request),
            initialMessages: projectBuilderConversation(request.messages.slice(0, -1), this.maxHistoryCharacters),
            tools: request.tools.map(toRuntimeTool),
            maxMessages: this.maxMessages,
            maxCharacters: this.maxHistoryCharacters + userMessageLimit,
            onEvent: (event) => {
                const builderEvent = toStreamEvent(event);
                if (builderEvent) {
                    request.onEvent(builderEvent);
                }
            }
        });
        const abort = () => runtime.abort();
        request.signal.addEventListener('abort', abort, {once: true});
        try {
            await runtime.prompt(latestMessage.text);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(redact(message, [this.getApiKey(this.provider) ?? '']));
        } finally {
            request.signal.removeEventListener('abort', abort);
        }
    }

    private getApiKey(provider: BuilderProvider): string | undefined {
        return this.getApiKeyOverride?.(provider) ?? this.credentialStore.get(provider);
    }
}
