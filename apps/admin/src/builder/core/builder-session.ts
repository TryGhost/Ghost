import type {BuilderConversationMessage, BuilderStreamEvent, ModelAccessAdapter} from './model-access';
import type {BuilderToolResult} from './tool-types';
import type {BuilderPreviewAdapter, BuilderWorkspace, BuilderWorkspaceState, PublishResult, WorkspaceSnapshot} from './workspace';

export type BuilderSessionStatus = 'idle' | 'loading' | 'ready' | 'running' | 'interrupted' | 'restoring' | 'publishing' | 'error';

export type BuilderSessionState = {
    status: BuilderSessionStatus;
    messages: readonly BuilderConversationMessage[];
    workspace: BuilderWorkspaceState;
    error?: string;
};

export type BuilderTurnResult = {
    turnId: string;
    userMessageId: string;
    status: 'complete' | 'interrupted';
};

type BuilderSessionOptions = {
    workspace: BuilderWorkspace;
    modelAccess: ModelAccessAdapter;
};

type TurnCheckpoint = {
    turnId: string;
    userMessageId: string;
    conversationCursor: number;
    snapshot: WorkspaceSnapshot;
};

type ActiveTurn = {
    turnId: string;
    userMessageId: string;
    assistantMessageId: string;
    controller: AbortController;
    stopRequested: boolean;
    streamAborted: boolean;
    streamError?: string;
};

const emptyWorkspaceState: BuilderWorkspaceState = {
    revision: '',
    dirty: false,
    validation: null
};

const userOnlyToolNames = new Set(['apply', 'commit', 'preview', 'publish']);
const maxUserMessageCharacters = 32_000;
const maxAssistantMessageCharacters = 64_000;
const maxStoredToolCharacters = 4_000;
const responseTruncationMarker = '\n\n[Response truncated]';

function boundedValue(value: unknown, limit = maxStoredToolCharacters): unknown {
    try {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) {
            return null;
        }
        if (serialized.length > limit) {
            return {truncated: true};
        }
        return JSON.parse(serialized) as unknown;
    } catch {
        return {unavailable: true};
    }
}

function boundedToolInput(input: Record<string, unknown>): Record<string, unknown> {
    const projected = boundedValue(input);
    if (projected && typeof projected === 'object' && !Array.isArray(projected) && 'truncated' in projected) {
        const identity: Record<string, unknown> = {truncated: true};
        if (typeof input.path === 'string') {
            identity.path = input.path.slice(0, 1_024);
        }
        if (input.values && typeof input.values === 'object' && !Array.isArray(input.values)) {
            identity.values = Object.fromEntries(Object.keys(input.values).slice(0, 50).map(key => [key, null]));
        }
        return identity;
    }
    return projected && typeof projected === 'object' && !Array.isArray(projected)
        ? projected as Record<string, unknown>
        : {unavailable: true};
}

function boundedToolResult(result: BuilderToolResult<unknown>): BuilderToolResult<unknown> {
    if (result.ok) {
        return {
            ok: true,
            revision: result.revision,
            data: boundedValue(result.data)
        };
    }
    return {
        ok: false,
        revision: result.revision,
        error: {
            code: result.error.code,
            message: result.error.message.slice(0, 2_000),
            retryable: result.error.retryable,
            ...(result.error.details === undefined ? {} : {details: boundedValue(result.error.details)})
        }
    };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export class BuilderSession {
    private readonly workspace: BuilderWorkspace;
    private readonly modelAccess: ModelAccessAdapter;
    private readonly listeners = new Set<(state: BuilderSessionState) => void>();
    private readonly unsubscribeWorkspace: () => void;
    private checkpoints: TurnCheckpoint[] = [];
    private activeTurn: ActiveTurn | null = null;
    private loadController: AbortController | null = null;
    private publishController: AbortController | null = null;
    private bufferedWorkspaceState: BuilderWorkspaceState | null = null;
    private sequence = 0;
    private currentState: BuilderSessionState = {
        status: 'idle',
        messages: [],
        workspace: emptyWorkspaceState
    };

    constructor({workspace, modelAccess}: BuilderSessionOptions) {
        this.workspace = workspace;
        this.modelAccess = modelAccess;
        this.unsubscribeWorkspace = workspace.subscribe((state) => {
            if (this.currentState.status === 'restoring') {
                this.bufferedWorkspaceState = state;
                return;
            }
            this.setState({...this.currentState, workspace: state});
        });
    }

    get state(): BuilderSessionState {
        return this.currentState;
    }

    get preview(): BuilderPreviewAdapter {
        return this.workspace.getPreview();
    }

    subscribe(listener: (state: BuilderSessionState) => void): () => void {
        this.listeners.add(listener);
        listener(this.currentState);
        return () => this.listeners.delete(listener);
    }

    async load(): Promise<void> {
        if (this.currentState.status !== 'idle' && this.currentState.status !== 'error') {
            throw new Error('The Builder session has already been loaded.');
        }

        this.setState({...this.currentState, status: 'loading', error: undefined});
        const controller = new AbortController();
        this.loadController = controller;
        try {
            await this.workspace.load(controller.signal);
            this.setState({...this.currentState, status: 'ready', error: undefined});
        } catch (error) {
            this.setState({...this.currentState, status: 'error', error: errorMessage(error)});
            throw error;
        } finally {
            if (this.loadController === controller) {
                this.loadController = null;
            }
        }
    }

    async startTurn(input: string): Promise<BuilderTurnResult> {
        if (this.activeTurn) {
            throw new Error('A Builder turn is already running.');
        }
        if (this.currentState.status !== 'ready' && this.currentState.status !== 'interrupted') {
            throw new Error('The Builder session is not ready for a turn.');
        }

        const text = input.trim();
        if (!text) {
            throw new Error('A Builder message cannot be empty.');
        }
        if (text.length > maxUserMessageCharacters) {
            throw new Error('A Builder message must be 32,000 characters or fewer.');
        }

        const turnId = this.nextId('turn');
        const userMessageId = this.nextId('message');
        const assistantMessageId = this.nextId('message');
        const conversationCursor = this.currentState.messages.length;
        const userMessage: BuilderConversationMessage = {id: userMessageId, role: 'user', text, status: 'complete'};
        const assistantMessage: BuilderConversationMessage = {id: assistantMessageId, role: 'assistant', text: '', status: 'pending'};
        const previousStatus = this.currentState.status;
        const previousMessages = this.currentState.messages;
        const messages = [...previousMessages, userMessage, assistantMessage];
        const controller = new AbortController();
        const activeTurn: ActiveTurn = {
            turnId,
            userMessageId,
            assistantMessageId,
            controller,
            stopRequested: false,
            streamAborted: false
        };
        this.activeTurn = activeTurn;
        this.setState({status: 'running', messages, workspace: this.currentState.workspace});

        let checkpointCreated = false;
        try {
            await this.workspace.flush?.(controller.signal);
            this.checkpoints.push({
                turnId,
                userMessageId,
                conversationCursor,
                snapshot: this.workspace.checkpointSnapshot?.() ?? this.workspace.snapshot()
            });
            checkpointCreated = true;
            await this.modelAccess.runTurn({
                messages: messages.slice(0, -1),
                tools: this.workspace.getTools().filter(tool => !userOnlyToolNames.has(tool.name.toLowerCase())),
                workspace: {
                    id: this.workspace.id,
                    kind: this.workspace.kind,
                    title: this.workspace.title,
                    revision: this.currentState.workspace.revision,
                    selection: this.workspace.getSelectionContext()
                },
                signal: controller.signal,
                onEvent: event => this.handleEvent(activeTurn, event)
            });
        } catch (error) {
            if (isAbortError(error)) {
                activeTurn.streamAborted = true;
            } else if (!activeTurn.stopRequested) {
                activeTurn.streamError = errorMessage(error);
            }
        }

        if (!checkpointCreated) {
            this.activeTurn = null;
            this.setState({
                ...this.currentState,
                status: activeTurn.stopRequested || activeTurn.streamAborted ? previousStatus : 'interrupted',
                messages: previousMessages,
                error: activeTurn.streamError
            });
            return {turnId, userMessageId, status: 'interrupted'};
        }

        const interruptedBeforePromotion = activeTurn.stopRequested || activeTurn.streamAborted || Boolean(activeTurn.streamError);
        if (!interruptedBeforePromotion) {
            try {
                await this.workspace.promoteCandidate(controller.signal);
            } catch (error) {
                if (isAbortError(error)) {
                    activeTurn.streamAborted = true;
                } else if (!activeTurn.stopRequested) {
                    activeTurn.streamError ??= errorMessage(error);
                }
            }
        }

        const interrupted = activeTurn.stopRequested || activeTurn.streamAborted || Boolean(activeTurn.streamError);
        const finalMessages = this.currentState.messages.map(message => message.id === assistantMessageId ? {
            ...message,
            status: interrupted ? 'interrupted' as const : 'complete' as const,
            toolCalls: message.toolCalls?.map(toolCall => interrupted && toolCall.status === 'running' ? {
                ...toolCall,
                status: 'interrupted' as const
            } : toolCall)
        } : message);
        this.activeTurn = null;
        this.setState({
            ...this.currentState,
            status: interrupted ? 'interrupted' : 'ready',
            messages: finalMessages,
            error: activeTurn.streamError
        });

        return {turnId, userMessageId, status: interrupted ? 'interrupted' : 'complete'};
    }

    stop(): void {
        if (!this.activeTurn) {
            return;
        }
        this.activeTurn.stopRequested = true;
        this.activeTurn.controller.abort();
    }

    async rewind(userMessageId: string): Promise<void> {
        if (this.activeTurn) {
            throw new Error('Stop the active Builder turn before rewinding.');
        }
        if (this.currentState.status !== 'ready' && this.currentState.status !== 'interrupted') {
            throw new Error('The Builder session is not ready to rewind.');
        }
        const checkpointIndex = this.checkpoints.findIndex(checkpoint => checkpoint.userMessageId === userMessageId);
        const checkpoint = this.checkpoints[checkpointIndex];
        if (!checkpoint) {
            throw new Error('The Builder checkpoint is no longer available.');
        }

        this.bufferedWorkspaceState = null;
        this.setState({...this.currentState, status: 'restoring', error: undefined});
        try {
            await this.workspace.flush?.(new AbortController().signal);
            const validation = await this.workspace.restore(checkpoint.snapshot);
            if (!validation.valid) {
                throw new Error('The Builder workspace could not restore this checkpoint.');
            }

            this.checkpoints = this.checkpoints.slice(0, checkpointIndex);
            const workspaceState = this.bufferedWorkspaceState ?? this.currentState.workspace;
            this.bufferedWorkspaceState = null;
            this.setState({
                status: 'ready',
                messages: this.currentState.messages.slice(0, checkpoint.conversationCursor),
                workspace: workspaceState
            });
        } catch (error) {
            const workspaceState = this.bufferedWorkspaceState ?? this.currentState.workspace;
            this.bufferedWorkspaceState = null;
            this.setState({...this.currentState, status: 'interrupted', workspace: workspaceState, error: errorMessage(error)});
            throw error;
        }
    }

    async retryLastTurn(): Promise<BuilderTurnResult> {
        const message = [...this.currentState.messages].reverse().find(item => item.role === 'user');
        if (!message) {
            throw new Error('There is no Builder message to retry.');
        }
        await this.rewind(message.id);
        return this.startTurn(message.text);
    }

    async publish(): Promise<PublishResult> {
        if (this.activeTurn) {
            throw new Error('Stop the active Builder turn before publishing.');
        }
        if (this.currentState.status !== 'ready' && this.currentState.status !== 'interrupted') {
            throw new Error('The Builder session is not ready to publish.');
        }

        this.setState({...this.currentState, status: 'publishing', error: undefined});
        const controller = new AbortController();
        this.publishController = controller;
        try {
            const result = await this.workspace.publish(controller.signal);
            this.setState({...this.currentState, status: 'ready', error: undefined});
            return result;
        } catch (error) {
            this.setState({...this.currentState, status: 'ready', error: undefined});
            throw error;
        } finally {
            if (this.publishController === controller) {
                this.publishController = null;
            }
        }
    }

    dispose(): void {
        this.loadController?.abort();
        this.loadController = null;
        this.publishController?.abort();
        this.publishController = null;
        this.stop();
        this.unsubscribeWorkspace();
        this.listeners.clear();
    }

    private handleEvent(turn: ActiveTurn, event: BuilderStreamEvent): void {
        if (turn !== this.activeTurn) {
            return;
        }
        if (event.type === 'assistant-text-delta') {
            this.updateMessage(turn.assistantMessageId, (message) => {
                const nextText = `${message.text}${event.text}`;
                if (nextText.length <= maxAssistantMessageCharacters) {
                    return {...message, text: nextText};
                }
                turn.streamError ??= 'The assistant response exceeded the Builder conversation limit.';
                turn.controller.abort();
                return {
                    ...message,
                    text: `${nextText.slice(0, maxAssistantMessageCharacters - responseTruncationMarker.length)}${responseTruncationMarker}`
                };
            });
        } else if (event.type === 'tool-start') {
            this.updateMessage(turn.assistantMessageId, message => ({
                ...message,
                toolCalls: [...(message.toolCalls ?? []), {
                    id: event.callId,
                    name: event.name,
                    input: boundedToolInput(event.input),
                    status: 'running'
                }]
            }));
        } else if (event.type === 'tool-end') {
            this.updateMessage(turn.assistantMessageId, message => ({
                ...message,
                toolCalls: (message.toolCalls ?? []).map(toolCall => toolCall.id === event.callId ? {
                    ...toolCall,
                    name: event.name,
                    status: turn.stopRequested || turn.controller.signal.aborted || turn.streamAborted ? 'interrupted' : 'complete',
                    result: boundedToolResult(event.result)
                } : toolCall)
            }));
        } else if (event.type === 'run-error') {
            turn.streamError = event.message;
        } else if (event.type === 'run-aborted') {
            turn.streamAborted = true;
        }
    }

    private updateMessage(id: string, update: (message: BuilderConversationMessage) => BuilderConversationMessage): void {
        this.setState({
            ...this.currentState,
            messages: this.currentState.messages.map(message => message.id === id ? update(message) : message)
        });
    }

    private setState(state: BuilderSessionState): void {
        this.currentState = state;
        this.listeners.forEach(listener => listener(state));
    }

    private nextId(prefix: string): string {
        this.sequence += 1;
        return `${prefix}-${this.sequence}`;
    }
}
