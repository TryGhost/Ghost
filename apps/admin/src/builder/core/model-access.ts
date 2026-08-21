import type {BuilderToolDefinition, BuilderToolResult} from './tool-types';
import type {BuilderAttachmentSummary} from './attachments';
import type {BuilderSelectionContext} from './workspace';

export type BuilderConversationToolCall = {
    id: string;
    name: string;
    input: Record<string, unknown>;
    status: 'running' | 'complete' | 'interrupted';
    result?: BuilderToolResult<unknown>;
};

export type BuilderConversationMessage = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    status: 'pending' | 'complete' | 'interrupted';
    toolCalls?: readonly BuilderConversationToolCall[];
};

export type BuilderModelWorkspaceContext = {
    id: string;
    kind: string;
    title: string;
    revision: string;
    selection: BuilderSelectionContext | null;
    attachments: readonly BuilderAttachmentSummary[];
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
    workspace: BuilderModelWorkspaceContext;
    signal: AbortSignal;
    onEvent: (event: BuilderStreamEvent) => void;
};

export interface ModelAccessAdapter {
    runTurn(request: BuilderModelTurnRequest): Promise<void>;
}
