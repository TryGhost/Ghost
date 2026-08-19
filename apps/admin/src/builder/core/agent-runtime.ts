import {Agent} from '@earendil-works/pi-agent-core';

import type {AgentEvent, AgentMessage, AgentTool, StreamFn} from '@earendil-works/pi-agent-core';
import type {Api, AssistantMessage, Message, Model, TSchema} from '@earendil-works/pi-ai';

export type BuilderToolResult = {
    text: string;
    details?: unknown;
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
    tools?: BuilderTool[];
    maxMessages?: number;
    onEvent?: (event: BuilderRuntimeEvent) => void;
};

function truncateAtTurnBoundary(messages: AgentMessage[], maxMessages: number): AgentMessage[] {
    const limit = Number.isFinite(maxMessages) ? Math.max(1, Math.floor(maxMessages)) : 80;
    if (messages.length <= limit) {
        return messages;
    }

    const userTurnStarts = messages.flatMap((message, index) => message.role === 'user' ? [index] : []);
    const fittingTurn = userTurnStarts.find(index => messages.length - index <= limit);
    const currentTurn = userTurnStarts.at(-1);

    if (fittingTurn !== undefined) {
        return messages.slice(fittingTurn);
    }
    if (currentTurn !== undefined) {
        return messages.slice(currentTurn);
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
            return {
                content: [{type: 'text', text: result.text}],
                details: result.details
            };
        }
    };
}

function assistantStopReason(message: AgentMessage): string {
    return message.role === 'assistant' ? message.stopReason : 'stop';
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

export function createAgentRuntime({model, getApiKey, streamFn, systemPrompt = '', tools = [], maxMessages = 80, onEvent = () => {}}: CreateAgentRuntimeOptions): AgentRuntime {
    const agent = new Agent({
        streamFn,
        getApiKey,
        toolExecution: 'sequential',
        transformContext: messages => Promise.resolve(truncateAtTurnBoundary(messages, maxMessages)),
        initialState: {
            model,
            systemPrompt,
            tools: tools.map(toPiTool)
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
