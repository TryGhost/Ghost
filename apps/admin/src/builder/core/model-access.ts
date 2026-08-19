import type {BuilderToolDefinition, BuilderToolResult} from './tool-types';

export type BuilderConversationMessage = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    status: 'pending' | 'complete' | 'interrupted';
};

export type BuilderStreamEvent =
    | {type: 'assistant-text-delta'; text: string}
    | {type: 'tool-start'; callId: string; name: string; input: Record<string, unknown>}
    | {type: 'tool-end'; callId: string; name: string; result: BuilderToolResult<unknown>}
    | {type: 'run-error'; message: string}
    | {type: 'run-aborted'}
    | {type: 'run-end'};

export type BuilderModelTurnRequest = {
    messages: readonly BuilderConversationMessage[];
    tools: readonly BuilderToolDefinition[];
    signal: AbortSignal;
    onEvent: (event: BuilderStreamEvent) => void;
};

export interface ModelAccessAdapter {
    runTurn(request: BuilderModelTurnRequest): Promise<void>;
}
