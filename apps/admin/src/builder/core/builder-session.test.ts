import {describe, expect, it, vi} from 'vitest';

import {BuilderSession} from './builder-session';

import type {BuilderModelTurnRequest, ModelAccessAdapter} from './model-access';
import type {BuilderToolDefinition} from './tool-types';
import type {BuilderPreviewAdapter, BuilderWorkspace, BuilderWorkspaceState, PublishResult, ValidationResult, WorkspaceSnapshot} from './workspace';

type ArtifactPayload = {value: string};

class FakeArtifactWorkspace implements BuilderWorkspace {
    readonly id = 'artifact-1';
    readonly kind = 'artifact';
    readonly title = 'Revenue chart';
    readonly preview: BuilderPreviewAdapter = {kind: 'artifact'};

    loadCalls = 0;
    publishCalls = 0;
    promoteCalls = 0;
    promoteError: Error | null = null;
    loadError: Error | null = null;
    restoreGate: Promise<void> | null = null;
    invalidCandidate: ArtifactPayload | null = null;
    selection: {id: string; label: string; data?: unknown} | null = null;
    private payload: ArtifactPayload = {value: 'initial'};
    private draftRevision = 'revision-0';
    private lastValidCandidate: WorkspaceSnapshot | null = null;
    private revisionNumber = 0;
    private listeners = new Set<(state: BuilderWorkspaceState) => void>();
    private workspaceState: BuilderWorkspaceState = {
        revision: 'revision-0',
        dirty: false,
        validation: null
    };

    get state(): BuilderWorkspaceState {
        return this.workspaceState;
    }

    get candidateSnapshot(): WorkspaceSnapshot | null {
        return this.lastValidCandidate ? structuredClone(this.lastValidCandidate) : null;
    }

    load(signal: AbortSignal): Promise<void> {
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        this.loadCalls += 1;
        if (this.loadError) {
            return Promise.reject(this.loadError);
        }
        return Promise.resolve();
    }

    snapshot(): WorkspaceSnapshot {
        return {revision: this.draftRevision, payload: structuredClone(this.payload)};
    }

    restore(snapshot: WorkspaceSnapshot): Promise<ValidationResult> {
        const restore = () => {
            this.payload = structuredClone(snapshot.payload as ArtifactPayload);
            this.draftRevision = snapshot.revision;
            this.revisionNumber = Number(snapshot.revision.split('-').at(-1));
            this.invalidCandidate = null;
            this.lastValidCandidate = null;
            const validation = {valid: true, diagnostics: [], revision: snapshot.revision};
            this.setState({
                revision: snapshot.revision,
                dirty: snapshot.revision !== 'revision-0',
                validation
            });
            return validation;
        };
        return this.restoreGate ? this.restoreGate.then(restore) : Promise.resolve(restore());
    }

    promoteCandidate(signal: AbortSignal): Promise<ValidationResult> {
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        this.promoteCalls += 1;
        if (this.promoteError) {
            return Promise.reject(this.promoteError);
        }
        if (this.lastValidCandidate) {
            this.payload = structuredClone(this.lastValidCandidate.payload as ArtifactPayload);
            this.draftRevision = this.lastValidCandidate.revision;
            this.lastValidCandidate = null;
            this.invalidCandidate = null;
            const validation = {valid: true, diagnostics: [], revision: this.draftRevision};
            this.setState({...this.workspaceState, revision: this.draftRevision, validation});
            return Promise.resolve(validation);
        }
        return Promise.resolve(this.workspaceState.validation ?? {valid: true, diagnostics: [], revision: this.draftRevision});
    }

    getTools(): BuilderToolDefinition[] {
        return [{
            name: 'set_value',
            description: 'Set the artifact value',
            inputSchema: {
                type: 'object',
                properties: {value: {type: 'string'}},
                required: ['value'],
                additionalProperties: false
            },
            execute: (input) => {
                const value = String(input.value);
                if (value === 'invalid') {
                    this.invalidCandidate = {value};
                    const validation = {
                        valid: false,
                        diagnostics: [{code: 'invalid_artifact', message: 'The artifact is invalid.', severity: 'error' as const}],
                        revision: this.workspaceState.revision
                    };
                    this.setState({...this.workspaceState, validation});
                    return Promise.resolve({
                        ok: false,
                        revision: this.workspaceState.revision,
                        error: {code: 'invalid_artifact', message: 'The artifact is invalid.', retryable: true}
                    });
                }

                this.invalidCandidate = null;
                this.revisionNumber += 1;
                const revision = `revision-${this.revisionNumber}`;
                this.lastValidCandidate = {revision, payload: {value}};
                const validation = {valid: true, diagnostics: [], revision};
                this.setState({revision, dirty: true, validation});
                return Promise.resolve({ok: true, revision, data: {value}, diagnostics: []});
            }
        }];
    }

    getPreview(): BuilderPreviewAdapter {
        return this.preview;
    }

    getSelectionContext(): {id: string; label: string; data?: unknown} | null {
        return this.selection;
    }

    publish(signal: AbortSignal): Promise<PublishResult> {
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        this.publishCalls += 1;
        this.setState({...this.workspaceState, dirty: false});
        return Promise.resolve({ok: true, revision: this.draftRevision});
    }

    subscribe(listener: (state: BuilderWorkspaceState) => void): () => void {
        this.listeners.add(listener);
        listener(this.workspaceState);
        return () => this.listeners.delete(listener);
    }

    private setState(state: BuilderWorkspaceState): void {
        this.workspaceState = state;
        this.listeners.forEach(listener => listener(state));
    }
}

class ScriptedModelAccess implements ModelAccessAdapter {
    readonly requests: BuilderModelTurnRequest[] = [];
    private scripts: Array<(request: BuilderModelTurnRequest) => Promise<void>> = [];

    enqueue(script: (request: BuilderModelTurnRequest) => Promise<void>): void {
        this.scripts.push(script);
    }

    async runTurn(request: BuilderModelTurnRequest): Promise<void> {
        this.requests.push(request);
        const script = this.scripts.shift();
        if (!script) {
            throw new Error('No model script queued');
        }
        await script(request);
    }
}

function completeWith(text: string): (request: BuilderModelTurnRequest) => Promise<void> {
    return (request) => {
        request.onEvent({type: 'assistant-text-delta', text});
        request.onEvent({type: 'run-end'});
        return Promise.resolve();
    };
}

function tool(request: BuilderModelTurnRequest, name: string): BuilderToolDefinition {
    const definition = request.tools.find(item => item.name === name);
    if (!definition) {
        throw new Error(`Missing tool: ${name}`);
    }
    return definition;
}

describe('BuilderSession', () => {
    it('loads a generic workspace and exposes its preview without theme assumptions', async () => {
        const workspace = new FakeArtifactWorkspace();
        const session = new BuilderSession({workspace, modelAccess: new ScriptedModelAccess()});

        await session.load();

        expect(workspace.loadCalls).toBe(1);
        expect(session.state).toMatchObject({status: 'ready', workspace: {revision: 'revision-0', dirty: false}});
        expect(session.preview).toBe(workspace.preview);
    });

    it('aborts an in-flight workspace load when the session is disposed', async () => {
        const workspace = new FakeArtifactWorkspace();
        let loadSignal: AbortSignal | undefined;
        vi.spyOn(workspace, 'load').mockImplementation((signal) => {
            loadSignal = signal;
            return new Promise((_resolve, reject) => {
                signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
            });
        });
        const session = new BuilderSession({workspace, modelAccess: new ScriptedModelAccess()});

        const loading = session.load();
        await vi.waitFor(() => expect(loadSignal).toBeDefined());
        session.dispose();

        await expect(loading).rejects.toMatchObject({name: 'AbortError'});
        expect(loadSignal?.aborted).toBe(true);
    });

    it('snapshots before a turn, promotes the last valid candidate, and completes the conversation', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'candidate'}, request.signal);
            request.onEvent({type: 'assistant-text-delta', text: 'Updated'});
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('Change the chart');

        expect(session.state).toMatchObject({status: 'ready', workspace: {revision: 'revision-1'}});
        expect(workspace.promoteCalls).toBe(1);
        expect(session.state.messages).toMatchObject([
            {role: 'user', text: 'Change the chart', status: 'complete'},
            {role: 'assistant', text: 'Updated', status: 'complete'}
        ]);

        const userMessageId = session.state.messages[0].id;
        await session.rewind(userMessageId);

        expect(workspace.snapshot()).toEqual({revision: 'revision-0', payload: {value: 'initial'}});
        expect(session.state.messages).toEqual([]);
    });

    it('passes transport-neutral workspace context and records canonical tool lifecycle on the assistant message', async () => {
        const workspace = new FakeArtifactWorkspace();
        workspace.selection = {id: 'marker-42', label: 'Revenue heading', data: {source: 'index.hbs:12:3'}};
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue((request) => {
            request.onEvent({type: 'tool-start', callId: 'call-1', name: 'set_value', input: {value: 'revised'}});
            request.onEvent({
                type: 'tool-end',
                callId: 'call-1',
                name: 'set_value',
                result: {ok: true, revision: 'revision-1', data: {value: 'revised'}}
            });
            request.onEvent({type: 'run-end'});
            return Promise.resolve();
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('Update this heading');

        expect(modelAccess.requests[0]?.workspace).toEqual({
            id: 'artifact-1',
            kind: 'artifact',
            title: 'Revenue chart',
            revision: 'revision-0',
            selection: workspace.selection
        });
        expect(session.state.messages.at(-1)).toMatchObject({
            role: 'assistant',
            toolCalls: [{
                id: 'call-1',
                name: 'set_value',
                input: {value: 'revised'},
                status: 'complete',
                result: {ok: true, revision: 'revision-1', data: {value: 'revised'}}
            }]
        });
    });

    it('retains the last valid candidate when a later mutation is invalid', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'valid'}, request.signal);
            await tool(request, 'set_value').execute({value: 'invalid'}, request.signal);
            expect(workspace.invalidCandidate).toEqual({value: 'invalid'});
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('Try two values');

        expect(workspace.invalidCandidate).toBeNull();
        expect(workspace.snapshot()).toEqual({revision: 'revision-1', payload: {value: 'valid'}});
        expect(session.state.workspace.validation).toMatchObject({valid: true, revision: 'revision-1'});
    });

    it('stops an active turn and retains a valid candidate', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        let started: (() => void) | undefined;
        const toolStarted = new Promise<void>((resolve) => {
            started = resolve;
        });
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'before-stop'}, request.signal);
            started?.();
            await new Promise<void>((_resolve, reject) => {
                request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
            });
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const turn = session.startTurn('Make a change and wait');
        await toolStarted;
        session.stop();
        await turn;

        expect(session.state.status).toBe('interrupted');
        expect(session.state.messages.at(-1)).toMatchObject({role: 'assistant', status: 'interrupted'});
        expect(workspace.snapshot()).toEqual({revision: 'revision-0', payload: {value: 'initial'}});
        expect(workspace.candidateSnapshot).toEqual({revision: 'revision-1', payload: {value: 'before-stop'}});
        expect(await session.publish()).toEqual({ok: true, revision: 'revision-0'});
    });

    it('marks an in-flight tool card interrupted when the user stops the turn', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        let toolStarted: (() => void) | undefined;
        const started = new Promise<void>((resolve) => {
            toolStarted = resolve;
        });
        modelAccess.enqueue(async (request) => {
            request.onEvent({type: 'tool-start', callId: 'call-1', name: 'set_value', input: {value: 'pending'}});
            toolStarted?.();
            await new Promise<void>((_resolve, reject) => {
                request.signal.addEventListener('abort', () => {
                    request.onEvent({
                        type: 'tool-end',
                        callId: 'call-1',
                        name: 'set_value',
                        result: {ok: false, revision: 'revision-0', error: {code: 'aborted', message: 'Stopped', retryable: true}}
                    });
                    reject(new DOMException('Aborted', 'AbortError'));
                }, {once: true});
            });
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const turn = session.startTurn('Start and stop');
        await started;
        session.stop();
        await turn;

        expect(session.state.messages.at(-1)).toMatchObject({
            status: 'interrupted',
            toolCalls: [{id: 'call-1', status: 'interrupted'}]
        });
    });

    it('marks provider failures interrupted without losing a valid candidate', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'before-error'}, request.signal);
            throw new Error('Provider unavailable');
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('Make a change');

        expect(session.state).toMatchObject({status: 'interrupted', error: 'Provider unavailable'});
        expect(workspace.snapshot()).toEqual({revision: 'revision-0', payload: {value: 'initial'}});
        expect(workspace.candidateSnapshot).toEqual({revision: 'revision-1', payload: {value: 'before-error'}});
    });

    it('treats an uncoupled provider AbortError as interrupted and does not promote', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(() => Promise.reject(new DOMException('Aborted', 'AbortError')));
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const result = await session.startTurn('Start a request');

        expect(result.status).toBe('interrupted');
        expect(session.state.status).toBe('interrupted');
        expect(workspace.promoteCalls).toBe(0);
    });

    it('treats an aborted candidate promotion as interrupted', async () => {
        const workspace = new FakeArtifactWorkspace();
        workspace.promoteError = new DOMException('Aborted', 'AbortError');
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(completeWith('Done'));
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const result = await session.startTurn('Finish the candidate');

        expect(result.status).toBe('interrupted');
        expect(session.state.status).toBe('interrupted');
    });

    it('rewinds conversation and discards the later branch before continuing', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'first'}, request.signal);
        });
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'second'}, request.signal);
        });
        modelAccess.enqueue(completeWith('Branched'));
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('First turn');
        const secondMessageId = (await session.startTurn('Second turn')).userMessageId;
        await session.rewind(secondMessageId);
        await session.startTurn('Replacement turn');

        expect(session.state.messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(['First turn', 'Replacement turn']);
        expect(session.state.messages.map(message => message.text)).not.toContain('Second turn');
        expect(workspace.snapshot()).toEqual({revision: 'revision-1', payload: {value: 'first'}});
        expect(modelAccess.requests.at(-1)?.messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(['First turn', 'Replacement turn']);
    });

    it('restores each earlier checkpoint across multiple completed turns', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        for (const value of ['first', 'second', 'third']) {
            modelAccess.enqueue(async (request) => {
                await tool(request, 'set_value').execute({value}, request.signal);
            });
        }
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const first = await session.startTurn('First turn');
        await session.startTurn('Second turn');
        const third = await session.startTurn('Third turn');

        await session.rewind(third.userMessageId);
        expect(workspace.snapshot()).toEqual({revision: 'revision-2', payload: {value: 'second'}});
        expect(session.state.messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(['First turn', 'Second turn']);

        await session.rewind(first.userMessageId);
        expect(workspace.snapshot()).toEqual({revision: 'revision-0', payload: {value: 'initial'}});
        expect(session.state.messages).toEqual([]);
    });

    it('publishes restored workspace and conversation state atomically', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'changed'}, request.signal);
        });
        const session = new BuilderSession({workspace, modelAccess});
        const observations: Array<{status: string; revision: string; messages: number}> = [];
        session.subscribe(state => observations.push({status: state.status, revision: state.workspace.revision, messages: state.messages.length}));
        await session.load();
        const turn = await session.startTurn('Change it');
        observations.length = 0;

        await session.rewind(turn.userMessageId);

        expect(observations).not.toContainEqual({status: 'restoring', revision: 'revision-0', messages: 2});
        expect(observations.at(-1)).toEqual({status: 'ready', revision: 'revision-0', messages: 0});
    });

    it('rewinds an interrupted turn with a valid unpromoted candidate atomically', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'partial'}, request.signal);
            throw new Error('Provider unavailable');
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const turn = await session.startTurn('Interrupted edit');
        expect(workspace.candidateSnapshot).toEqual({revision: 'revision-1', payload: {value: 'partial'}});

        await session.rewind(turn.userMessageId);

        expect(session.state).toMatchObject({status: 'ready', messages: []});
        expect(workspace.snapshot()).toEqual({revision: 'revision-0', payload: {value: 'initial'}});
        expect(workspace.candidateSnapshot).toBeNull();
    });

    it('rewinds an interrupted turn that made no valid mutation', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue((request) => {
            request.onEvent({type: 'assistant-text-delta', text: 'I could not finish'});
            request.onEvent({type: 'run-aborted'});
            return Promise.resolve();
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const turn = await session.startTurn('Interrupted without edits');
        await session.rewind(turn.userMessageId);

        expect(session.state).toMatchObject({status: 'ready', messages: []});
        expect(workspace.snapshot()).toEqual({revision: 'revision-0', payload: {value: 'initial'}});
        expect(workspace.candidateSnapshot).toBeNull();
    });

    it('rewinds an interrupted turn before retrying it', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'partial'}, request.signal);
            throw new Error('Provider unavailable');
        });
        modelAccess.enqueue(async (request) => {
            await tool(request, 'set_value').execute({value: 'retried'}, request.signal);
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('Make the change');
        await session.retryLastTurn();

        expect(session.state.messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(['Make the change']);
        expect(modelAccess.requests.at(-1)?.messages.filter(message => message.role === 'user').map(message => message.text)).toEqual(['Make the change']);
        expect(workspace.snapshot()).toEqual({revision: 'revision-1', payload: {value: 'retried'}});
    });

    it('publishes only through the explicit user command', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(completeWith('Done'));
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('Prepare it');
        expect(workspace.publishCalls).toBe(0);

        const result = await session.publish();
        expect(result).toEqual({ok: true, revision: 'revision-0'});
        expect(workspace.publishCalls).toBe(1);
    });

    it('does not expose publish-like workspace tools to the model', async () => {
        const workspace = new FakeArtifactWorkspace();
        const safeTools = workspace.getTools();
        workspace.getTools = () => [...safeTools, {
            name: 'publish',
            description: 'Publish without confirmation',
            inputSchema: {type: 'object'},
            execute: async () => {
                await workspace.publish(new AbortController().signal);
                return {ok: true, revision: workspace.state.revision, data: {}};
            }
        }];
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(() => {
            return Promise.resolve();
        });
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        await session.startTurn('Finish the work');

        expect(modelAccess.requests[0]?.tools.map(item => item.name)).toEqual(['set_value']);
        expect(workspace.publishCalls).toBe(0);
    });

    it('notifies subscribers for deterministic state transitions', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(completeWith('Done'));
        const session = new BuilderSession({workspace, modelAccess});
        const statuses: string[] = [];
        const unsubscribe = session.subscribe(state => statuses.push(state.status));

        await session.load();
        await session.startTurn('Run');
        unsubscribe();

        expect(statuses).toEqual(['idle', 'loading', 'ready', 'running', 'running', 'ready']);
    });

    it('rejects overlapping turns', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        let release: (() => void) | undefined;
        modelAccess.enqueue(() => new Promise<void>((resolve) => {
            release = resolve;
        }));
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();

        const running = session.startTurn('First');
        await vi.waitFor(() => expect(session.state.status).toBe('running'));
        await expect(session.startTurn('Second')).rejects.toThrow('A Builder turn is already running.');
        release?.();
        await running;
    });

    it('rejects a user prompt that exceeds the bounded turn input', async () => {
        const workspace = new FakeArtifactWorkspace();
        const session = new BuilderSession({workspace, modelAccess: new ScriptedModelAccess()});
        await session.load();

        await expect(session.startTurn('x'.repeat(32_001))).rejects.toThrow('32,000 characters or fewer');
        expect(session.state.messages).toEqual([]);
    });

    it('keeps a failed load unusable and allows an explicit retry', async () => {
        const workspace = new FakeArtifactWorkspace();
        workspace.loadError = new Error('Could not load workspace');
        const session = new BuilderSession({workspace, modelAccess: new ScriptedModelAccess()});

        await expect(session.load()).rejects.toThrow('Could not load workspace');
        expect(session.state).toMatchObject({status: 'error', error: 'Could not load workspace'});
        await expect(session.startTurn('Do not run')).rejects.toThrow('not ready for a turn');
        await expect(session.publish()).rejects.toThrow('not ready to publish');

        workspace.loadError = null;
        await session.load();
        expect(session.state.status).toBe('ready');
        expect(workspace.loadCalls).toBe(2);
    });

    it('serializes rewind against turns, publishing, and another rewind', async () => {
        const workspace = new FakeArtifactWorkspace();
        const modelAccess = new ScriptedModelAccess();
        modelAccess.enqueue(completeWith('Done'));
        const session = new BuilderSession({workspace, modelAccess});
        await session.load();
        const userMessageId = (await session.startTurn('Checkpoint me')).userMessageId;
        let releaseRestore: (() => void) | undefined;
        workspace.restoreGate = new Promise<void>((resolve) => {
            releaseRestore = resolve;
        });

        const rewind = session.rewind(userMessageId);
        await vi.waitFor(() => expect(session.state.status).toBe('restoring'));

        await expect(session.startTurn('Race the restore')).rejects.toThrow('not ready for a turn');
        await expect(session.publish()).rejects.toThrow('not ready to publish');
        await expect(session.rewind(userMessageId)).rejects.toThrow('not ready to rewind');

        releaseRestore?.();
        await rewind;
        expect(session.state.status).toBe('ready');
    });
});
