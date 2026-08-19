import type {BuilderConversationMessage, BuilderStreamEvent, ModelAccessAdapter} from './model-access';
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
        try {
            await this.workspace.load(controller.signal);
            this.setState({...this.currentState, status: 'ready', error: undefined});
        } catch (error) {
            this.setState({...this.currentState, status: 'error', error: errorMessage(error)});
            throw error;
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

        const turnId = this.nextId('turn');
        const userMessageId = this.nextId('message');
        const assistantMessageId = this.nextId('message');
        const conversationCursor = this.currentState.messages.length;
        this.checkpoints.push({
            turnId,
            userMessageId,
            conversationCursor,
            snapshot: this.workspace.checkpointSnapshot?.() ?? this.workspace.snapshot()
        });

        const userMessage: BuilderConversationMessage = {id: userMessageId, role: 'user', text, status: 'complete'};
        const assistantMessage: BuilderConversationMessage = {id: assistantMessageId, role: 'assistant', text: '', status: 'pending'};
        const messages = [...this.currentState.messages, userMessage, assistantMessage];
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

        try {
            await this.modelAccess.runTurn({
                messages: messages.slice(0, -1),
                tools: this.workspace.getTools(),
                signal: controller.signal,
                onEvent: event => this.handleEvent(activeTurn, event)
            });
        } catch (error) {
            if (!activeTurn.stopRequested && !isAbortError(error)) {
                activeTurn.streamError = errorMessage(error);
            }
        }

        const interruptedBeforePromotion = activeTurn.stopRequested || activeTurn.streamAborted || Boolean(activeTurn.streamError);
        if (!interruptedBeforePromotion) {
            try {
                await this.workspace.promoteCandidate(controller.signal);
            } catch (error) {
                if (!activeTurn.stopRequested && !isAbortError(error)) {
                    activeTurn.streamError ??= errorMessage(error);
                }
            }
        }

        const interrupted = activeTurn.stopRequested || activeTurn.streamAborted || Boolean(activeTurn.streamError);
        const finalMessages = this.currentState.messages.map(message => message.id === assistantMessageId ? {
            ...message,
            status: interrupted ? 'interrupted' as const : 'complete' as const
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

        this.setState({...this.currentState, status: 'restoring', error: undefined});
        try {
            const validation = await this.workspace.restore(checkpoint.snapshot);
            if (!validation.valid) {
                throw new Error('The Builder workspace could not restore this checkpoint.');
            }

            this.checkpoints = this.checkpoints.slice(0, checkpointIndex);
            this.setState({
                status: 'ready',
                messages: this.currentState.messages.slice(0, checkpoint.conversationCursor),
                workspace: this.currentState.workspace
            });
        } catch (error) {
            this.setState({...this.currentState, status: 'interrupted', error: errorMessage(error)});
            throw error;
        }
    }

    async publish(): Promise<PublishResult> {
        if (this.activeTurn) {
            throw new Error('Stop the active Builder turn before publishing.');
        }
        if (this.currentState.status !== 'ready' && this.currentState.status !== 'interrupted') {
            throw new Error('The Builder session is not ready to publish.');
        }

        this.setState({...this.currentState, status: 'publishing', error: undefined});
        try {
            const result = await this.workspace.publish(new AbortController().signal);
            this.setState({...this.currentState, status: 'ready', error: result.ok ? undefined : result.error.message});
            return result;
        } catch (error) {
            this.setState({...this.currentState, status: 'interrupted', error: errorMessage(error)});
            throw error;
        }
    }

    dispose(): void {
        this.stop();
        this.unsubscribeWorkspace();
        this.listeners.clear();
    }

    private handleEvent(turn: ActiveTurn, event: BuilderStreamEvent): void {
        if (turn !== this.activeTurn) {
            return;
        }
        if (event.type === 'assistant-text-delta') {
            this.updateMessage(turn.assistantMessageId, message => ({...message, text: `${message.text}${event.text}`}));
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
