import {Agent} from '@earendil-works/pi-agent-core';

import type {AgentEvent, AgentMessage, AgentTool, StreamFn} from '@earendil-works/pi-agent-core';
import type {Api, AssistantMessage, ImageContent, Message, Model, TextContent, TSchema} from '@earendil-works/pi-ai';

export type BuilderToolResult = {
    text: string;
    details?: unknown;
    attachments?: Array<{type: 'image'; mediaType: string; data: string}>;
};

export type BuilderRuntimePromptMessage = {
    role: 'user' | 'assistant';
    text: string;
};

export type BuilderTool = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (input: Record<string, unknown>, signal: AbortSignal) => Promise<BuilderToolResult>;
};

export type BuilderRuntimeMessage = {
    role: 'user' | 'assistant' | 'tool';
    text: string;
    toolName?: string;
    toolCallId?: string;
    isError?: boolean;
};

export type BuilderRuntimeEvent =
    | {type: 'assistant-text-delta'; text: string}
    | {type: 'tool-start'; callId: string; name: string; input: Record<string, unknown>}
    | {type: 'tool-end'; callId: string; name: string; result: BuilderToolResult; isError: boolean}
    | {type: 'turn-end'; stopReason: string}
    | {type: 'run-error'; message: string}
    | {type: 'run-aborted'}
    | {type: 'run-end'};

export type AgentRuntime = {
    prompt: (input: string) => Promise<void>;
    abort: () => void;
    readonly messages: BuilderRuntimeMessage[];
};

type CreateAgentRuntimeOptions = {
    model: Model<Api>;
    getApiKey: () => string | undefined;
    streamFn: StreamFn;
    systemPrompt?: string;
    initialMessages?: readonly BuilderRuntimePromptMessage[];
    tools?: BuilderTool[];
    maxMessages?: number;
    maxCharacters?: number;
    maxImageCharacters?: number;
    onEvent?: (event: BuilderRuntimeEvent) => void;
};

function messageCharacters(message: AgentMessage): number {
    if (!('content' in message)) {
        return 0;
    }
    if (typeof message.content === 'string') {
        return message.content.length;
    }
    return message.content.reduce((total, item) => {
        if (item.type === 'text') {
            return total + item.text.length;
        }
        if (item.type === 'thinking') {
            return total + item.thinking.length;
        }
        if (item.type === 'toolCall') {
            return total + item.name.length + JSON.stringify(item.arguments).length;
        }
        return total;
    }, 0);
}

function messageImageCharacters(message: AgentMessage): number {
    if (!('content' in message) || typeof message.content === 'string') {
        return 0;
    }
    return message.content.reduce((total, item) => item.type === 'image' ? total + item.data.length : total, 0);
}

function contextFits(messages: AgentMessage[], maxMessages: number, maxCharacters: number, maxImageCharacters: number): boolean {
    return messages.length <= maxMessages &&
        messages.reduce((total, message) => total + messageCharacters(message), 0) <= maxCharacters &&
        messages.reduce((total, message) => total + messageImageCharacters(message), 0) <= maxImageCharacters;
}

function contextSummary(messages: readonly AgentMessage[]): string {
    return messages.map((message) => {
        if (!('content' in message)) {
            return '';
        }
        const prefix = message.role === 'toolResult' ? `Tool ${message.toolName} (${message.isError ? 'error' : 'complete'}): ` : `${message.role}: `;
        if (typeof message.content === 'string') {
            return `${prefix}${message.content}`;
        }
        const content = message.content.map((item) => {
            if (item.type === 'text') {
                return item.text;
            }
            if (item.type === 'thinking') {
                return item.thinking;
            }
            if (item.type === 'toolCall') {
                return `called ${item.name} ${JSON.stringify(item.arguments)}`;
            }
            return '[image omitted from compacted context]';
        }).join(' ');
        return `${prefix}${content}`;
    }).filter(Boolean).join('\n');
}

function compactCurrentTurn(messages: AgentMessage[], start: number, maxMessages: number, maxCharacters: number, maxImageCharacters: number): AgentMessage[] {
    const userMessage = messages[start];
    if (!userMessage || userMessage.role !== 'user') {
        return messages.slice(-maxMessages);
    }

    const groups: AgentMessage[][] = [];
    messages.slice(start + 1).forEach((message) => {
        if (message.role === 'assistant' || !groups.length) {
            groups.push([message]);
        } else {
            groups.at(-1)?.push(message);
        }
    });

    if (!groups.length) {
        if (contextFits([userMessage], maxMessages, maxCharacters, maxImageCharacters)) {
            return [userMessage];
        }
        const original = typeof userMessage.content === 'string' ? userMessage.content : userMessage.content.filter(item => item.type === 'text').map(item => item.text).join('');
        return [{...userMessage, content: original.slice(0, maxCharacters)}];
    }

    const selected: AgentMessage[][] = [];
    let firstDroppedGroup = -1;
    for (let index = groups.length - 1; index >= 0; index -= 1) {
        const candidate = [userMessage, ...groups.slice(index).flat()];
        if (!contextFits(candidate, maxMessages, maxCharacters, maxImageCharacters)) {
            firstDroppedGroup = index;
            break;
        }
        selected.unshift(groups[index] ?? []);
    }

    if (firstDroppedGroup < 0) {
        return [userMessage, ...selected.flat()];
    }

    const selectedMessages = selected.flat();
    const selectedCharacters = selectedMessages.reduce((total, message) => total + messageCharacters(message), 0);
    const userCharacters = messageCharacters(userMessage);
    if (!contextFits([userMessage, ...selectedMessages], maxMessages, maxCharacters, maxImageCharacters)) {
        const original = typeof userMessage.content === 'string' ? userMessage.content : userMessage.content.filter(item => item.type === 'text').map(item => item.text).join('');
        return [{...userMessage, content: original.slice(0, Math.max(1, maxCharacters - selectedCharacters))}, ...selectedMessages];
    }

    const available = Math.max(0, maxCharacters - selectedCharacters - userCharacters);
    const marker = '[Earlier Builder tool activity compacted to stay within the context limit]';
    const dropped = contextSummary(groups.slice(0, firstDroppedGroup + 1).flat());
    const summaryAllowance = Math.max(0, available - marker.length - 3);
    if (summaryAllowance === 0) {
        return [userMessage, ...selectedMessages];
    }

    const summary = dropped.length <= summaryAllowance ? dropped : dropped.slice(Math.max(0, dropped.length - summaryAllowance));
    const compactedSummary = `\n\n${marker}\n${summary}`;
    const compactedUser: AgentMessage = {
        ...userMessage,
        content: typeof userMessage.content === 'string' ? `${userMessage.content}${compactedSummary}` : [
            ...userMessage.content,
            {type: 'text', text: compactedSummary}
        ]
    };
    return [compactedUser, ...selectedMessages];
}

function truncateAtTurnBoundary(messages: AgentMessage[], maxMessages: number, maxCharacters: number, maxImageCharacters: number): AgentMessage[] {
    const limit = Number.isFinite(maxMessages) ? Math.max(1, Math.floor(maxMessages)) : 80;
    const characterLimit = Number.isFinite(maxCharacters) ? Math.max(1, Math.floor(maxCharacters)) : 100_000;
    const imageLimit = Number.isFinite(maxImageCharacters) ? Math.max(1, Math.floor(maxImageCharacters)) : 5_000_000;
    const fits = (start: number) => contextFits(messages.slice(start), limit, characterLimit, imageLimit);
    if (fits(0)) {
        return messages;
    }

    const userTurnStarts = messages.flatMap((message, index) => message.role === 'user' ? [index] : []);
    const fittingTurn = userTurnStarts.find(fits);
    const currentTurn = userTurnStarts.at(-1);

    if (fittingTurn !== undefined) {
        return messages.slice(fittingTurn);
    }
    if (currentTurn !== undefined) {
        return compactCurrentTurn(messages, currentTurn, limit, characterLimit, imageLimit);
    }
    return messages.slice(-limit);
}

function contentText(message: Message): string {
    if (message.role === 'user') {
        return typeof message.content === 'string' ? message.content : message.content.filter(item => item.type === 'text').map(item => item.text).join('');
    }

    return message.content.filter(item => item.type === 'text').map(item => item.text).join('');
}

function toBuilderMessage(message: AgentMessage): BuilderRuntimeMessage | undefined {
    if (!('content' in message)) {
        return undefined;
    }

    if (message.role === 'user' || message.role === 'assistant') {
        return {role: message.role, text: contentText(message)};
    }

    if (message.role === 'toolResult') {
        return {
            role: 'tool',
            text: contentText(message),
            toolName: message.toolName,
            toolCallId: message.toolCallId,
            isError: message.isError
        };
    }

    return undefined;
}

function toPiTool(tool: BuilderTool): AgentTool<TSchema, unknown> {
    return {
        name: tool.name,
        label: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
        executionMode: 'sequential',
        execute: async (_callId, input, signal) => {
            const result = await tool.execute(input as Record<string, unknown>, signal ?? new AbortController().signal);
            const content: Array<TextContent | ImageContent> = [{type: 'text', text: result.text}];
            result.attachments?.forEach((attachment) => {
                content.push({type: 'image', data: attachment.data, mimeType: attachment.mediaType});
            });
            return {
                content,
                details: result.details
            };
        }
    };
}

const emptyUsage = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}
};

function toPiHistoryMessage(message: BuilderRuntimePromptMessage, model: Model<Api>, timestamp: number): AgentMessage {
    if (message.role === 'user') {
        return {role: 'user', content: message.text, timestamp};
    }
    return {
        role: 'assistant',
        content: [{type: 'text', text: message.text}],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage: emptyUsage,
        stopReason: 'stop',
        timestamp
    };
}

function assistantStopReason(message: AgentMessage): string {
    return message.role === 'assistant' ? message.stopReason : 'stop';
}

function isFailedBuilderEnvelope(value: unknown): boolean {
    return Boolean(value && typeof value === 'object' && 'ok' in value && value.ok === false);
}

function emitBuilderEvent(event: AgentEvent, emit: (event: BuilderRuntimeEvent) => void): void {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        emit({type: 'assistant-text-delta', text: event.assistantMessageEvent.delta});
    } else if (event.type === 'tool_execution_start') {
        emit({type: 'tool-start', callId: event.toolCallId, name: event.toolName, input: event.args as Record<string, unknown>});
    } else if (event.type === 'tool_execution_end') {
        const result = event.result as {content?: Array<{type: string; text?: string}>; details?: unknown};
        emit({
            type: 'tool-end',
            callId: event.toolCallId,
            name: event.toolName,
            result: {
                text: result.content?.filter(item => item.type === 'text').map(item => item.text ?? '').join('') ?? '',
                details: result.details
            },
            isError: event.isError
        });
    } else if (event.type === 'turn_end') {
        const stopReason = assistantStopReason(event.message);
        emit({type: 'turn-end', stopReason});
        if (stopReason === 'aborted') {
            emit({type: 'run-aborted'});
        } else if (stopReason === 'error') {
            emit({type: 'run-error', message: (event.message as AssistantMessage).errorMessage ?? 'The model request failed.'});
        }
    } else if (event.type === 'agent_end') {
        emit({type: 'run-end'});
    }
}

export function createAgentRuntime({model, getApiKey, streamFn, systemPrompt = '', initialMessages = [], tools = [], maxMessages = 80, maxCharacters = 100_000, maxImageCharacters = 5_000_000, onEvent = () => {}}: CreateAgentRuntimeOptions): AgentRuntime {
    const historyTimestamp = Date.now() - initialMessages.length;
    const agent = new Agent({
        streamFn,
        getApiKey,
        toolExecution: 'sequential',
        afterToolCall: context => Promise.resolve(isFailedBuilderEnvelope(context.result.details) ? {isError: true} : undefined),
        transformContext: messages => Promise.resolve(truncateAtTurnBoundary(messages, maxMessages, maxCharacters, maxImageCharacters)),
        initialState: {
            model,
            systemPrompt,
            tools: tools.map(toPiTool),
            messages: initialMessages.map((message, index) => toPiHistoryMessage(message, model, historyTimestamp + index))
        }
    });

    agent.subscribe((event) => {
        emitBuilderEvent(event, onEvent);
    });

    return {
        prompt: input => agent.prompt(input),
        abort: () => agent.abort(),
        get messages() {
            return agent.state.messages.map(toBuilderMessage).filter((message): message is BuilderRuntimeMessage => Boolean(message));
        }
    };
}
