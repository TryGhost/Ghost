import {artifactPayload, cloneArtifactDraft} from './artifact-state';
import {findInArtifactHtml, readArtifactHtml, replaceInArtifactHtml, validateArtifactDraft, writeArtifactHtml} from './artifact-tools';

import type {BuilderAttachmentSnapshot, BuilderAttachmentSummary, BuilderAttachments} from '@/builder/core/attachments';
import type {BuilderToolDefinition, BuilderToolResult, WorkspaceDiagnostic} from '@/builder/core/tool-types';
import type {BuilderPreviewAdapter, BuilderSelectionContext, BuilderWorkspace, BuilderWorkspaceState, PublishResult, ValidationResult, WorkspaceSnapshot} from '@/builder/core/workspace';
import type {ArtifactDraft, ArtifactPayload} from './artifact-state';
import type {ArtifactCandidateResult} from './artifact-tools';
import type {PreviewElementInspection, PreviewElementTarget, PreviewPageInspection} from '@/builder/workspaces/theme/preview/preview-inspection';
import type {ScreenshotRequest, ScreenshotResult} from '@/builder/workspaces/theme/preview/screenshot';

type ArtifactCheckpointPayload = {
    promoted: ArtifactDraft;
    candidate: ArtifactDraft | null;
};

export type ArtifactPreview = BuilderPreviewAdapter & {
    start(draft: ArtifactDraft, signal: AbortSignal): Promise<ValidationResult>;
    renderCandidate(draft: ArtifactDraft, signal: AbortSignal): Promise<ValidationResult>;
    restoreDraft(draft: ArtifactDraft, signal: AbortSignal): Promise<ValidationResult>;
    inspectPage(signal: AbortSignal): Promise<PreviewPageInspection>;
    inspectElement(target: PreviewElementTarget, signal: AbortSignal): Promise<PreviewElementInspection>;
    screenshot(request: ScreenshotRequest, signal: AbortSignal): Promise<ScreenshotResult>;
    flush?(signal: AbortSignal): Promise<void>;
    getSelectionContext?(): BuilderSelectionContext | null;
    readonly draft?: ArtifactDraft | null;
};

type ArtifactWorkspaceOptions = {
    id: string;
    title: string;
    load: (signal: AbortSignal) => Promise<ArtifactDraft>;
    preview: ArtifactPreview;
    save?: (payload: ArtifactPayload, signal: AbortSignal) => Promise<void>;
    attachments?: BuilderAttachments;
};

const unloadedState: BuilderWorkspaceState = {revision: '', dirty: false, validation: null};

function abortIfNeeded(signal: AbortSignal): void {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
}

function isAbortError(error: unknown): error is DOMException {
    return error instanceof DOMException && error.name === 'AbortError';
}

function sameSavedPayload(left: ArtifactDraft, right: ArtifactDraft): boolean {
    return left.id === right.id
        && left.artifactVersion === right.artifactVersion
        && left.title === right.title
        && left.description === right.description
        && left.html === right.html;
}

function isCheckpointPayload(value: unknown): value is ArtifactCheckpointPayload {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const payload = value as Partial<ArtifactCheckpointPayload>;
    const validDraft = (draft: unknown): draft is ArtifactDraft => Boolean(draft && typeof draft === 'object'
        && typeof (draft as ArtifactDraft).revision === 'string'
        && typeof (draft as ArtifactDraft).id === 'string'
        && typeof (draft as ArtifactDraft).artifactVersion === 'number'
        && typeof (draft as ArtifactDraft).title === 'string'
        && typeof (draft as ArtifactDraft).description === 'string'
        && typeof (draft as ArtifactDraft).html === 'string');
    return validDraft(payload.promoted) && (payload.candidate === null || validDraft(payload.candidate));
}

function screenshotAttachment(result: ScreenshotResult): BuilderToolResult<unknown> {
    const prefix = 'data:image/png;base64,';
    if (!result.dataUrl.startsWith(prefix)) {
        return {ok: false, revision: '', error: {code: 'preview_screenshot_failed', message: 'The preview returned an invalid screenshot.', retryable: true}};
    }
    return {
        ok: true,
        revision: '',
        data: {width: result.width, height: result.height, warnings: result.warnings},
        attachments: [{type: 'image', mediaType: 'image/png', data: result.dataUrl.slice(prefix.length)}]
    };
}

export class ArtifactWorkspace implements BuilderWorkspace {
    readonly id: string;
    readonly kind = 'artifact';
    readonly title: string;

    private readonly loadDraft: ArtifactWorkspaceOptions['load'];
    private readonly preview: ArtifactPreview;
    private readonly saveDraft?: ArtifactWorkspaceOptions['save'];
    private readonly attachments?: BuilderAttachments;
    private readonly listeners = new Set<(state: BuilderWorkspaceState) => void>();
    private currentDraft: ArtifactDraft | null = null;
    private candidate: ArtifactDraft | null = null;
    private baseline: ArtifactDraft | null = null;
    private currentState = unloadedState;
    private mutationTail: Promise<void> = Promise.resolve();

    constructor({id, title, load, preview, save, attachments}: ArtifactWorkspaceOptions) {
        this.id = id;
        this.title = title;
        this.loadDraft = load;
        this.preview = preview;
        this.saveDraft = save;
        this.attachments = attachments;
    }

    get state(): BuilderWorkspaceState {
        return structuredClone(this.currentState);
    }

    get draft(): ArtifactDraft {
        return cloneArtifactDraft(this.requireDraft());
    }

    get candidateDraft(): ArtifactDraft | null {
        return this.candidate ? cloneArtifactDraft(this.candidate) : null;
    }

    get hasCandidate(): boolean {
        return this.candidate !== null;
    }

    get hasPromotedChanges(): boolean {
        return Boolean(this.currentDraft && this.baseline && !sameSavedPayload(this.currentDraft, this.baseline));
    }

    async load(signal: AbortSignal): Promise<void> {
        abortIfNeeded(signal);
        const draft = await this.loadDraft(signal);
        abortIfNeeded(signal);
        const payload = validateArtifactDraft(draft);
        if (!payload.ok) {
            throw new Error(payload.error.message);
        }
        const validation = await this.preview.start(draft, signal);
        if (!validation.valid) {
            throw new Error(validation.diagnostics[0]?.message ?? 'The artifact preview could not load.');
        }
        this.currentDraft = cloneArtifactDraft(draft);
        this.baseline = cloneArtifactDraft(draft);
        this.candidate = null;
        this.setState({revision: draft.revision, dirty: false, validation});
    }

    async flush(signal: AbortSignal): Promise<void> {
        abortIfNeeded(signal);
        await this.mutationTail;
        await this.preview.flush?.(signal);
        this.syncPreviewSelection();
        abortIfNeeded(signal);
    }

    snapshot(): WorkspaceSnapshot {
        this.syncPreviewSelection();
        const draft = this.requireDraft();
        return {revision: draft.revision, payload: cloneArtifactDraft(draft)};
    }

    checkpointSnapshot(): WorkspaceSnapshot {
        this.syncPreviewSelection();
        const promoted = this.requireDraft();
        return {
            revision: this.candidate?.revision ?? promoted.revision,
            payload: {
                promoted: cloneArtifactDraft(promoted),
                candidate: this.candidate ? cloneArtifactDraft(this.candidate) : null
            } satisfies ArtifactCheckpointPayload
        };
    }

    async restore(snapshot: WorkspaceSnapshot): Promise<ValidationResult> {
        await this.mutationTail;
        const payload = isCheckpointPayload(snapshot.payload)
            ? snapshot.payload
            : {promoted: snapshot.payload as ArtifactDraft, candidate: null};
        const active = payload.candidate ?? payload.promoted;
        const validation = await this.preview.restoreDraft(active, new AbortController().signal);
        if (!validation.valid || validation.revision !== active.revision) {
            return validation.valid ? {
                valid: false,
                revision: active.revision,
                diagnostics: [{code: 'artifact_restore_mismatch', message: 'The restored preview did not match the checkpoint.', severity: 'error'}]
            } : validation;
        }
        this.currentDraft = cloneArtifactDraft(payload.promoted);
        this.candidate = payload.candidate ? cloneArtifactDraft(payload.candidate) : null;
        this.setState({
            revision: active.revision,
            dirty: this.isDirty(),
            validation
        });
        return validation;
    }

    async promoteCandidate(signal: AbortSignal): Promise<ValidationResult> {
        abortIfNeeded(signal);
        await this.mutationTail;
        abortIfNeeded(signal);
        if (this.candidate) {
            this.currentDraft = cloneArtifactDraft(this.candidate);
            this.candidate = null;
        }
        const draft = this.requireDraft();
        const validation = {valid: true, diagnostics: [], revision: draft.revision};
        this.setState({revision: draft.revision, dirty: this.isDirty(), validation});
        return validation;
    }

    getTools(): BuilderToolDefinition[] {
        return [
            {
                name: 'read_html',
                description: 'Read a bounded line and column range from the current artifact HTML.',
                inputSchema: {type: 'object', properties: {startLine: {type: 'integer', minimum: 1}, startColumn: {type: 'integer', minimum: 1}, endLine: {type: 'integer', minimum: 1}}, additionalProperties: false},
                execute: (input, signal) => this.executeRead(signal, () => readArtifactHtml(this.activeDraft(), input))
            },
            {
                name: 'find_in_html',
                description: 'Find bounded literal matches in the current artifact HTML.',
                inputSchema: {type: 'object', properties: {query: {type: 'string', minLength: 1, maxLength: 256}}, required: ['query'], additionalProperties: false},
                execute: (input, signal) => this.executeRead(signal, () => findInArtifactHtml(this.activeDraft(), input))
            },
            {
                name: 'replace_in_html',
                description: 'Replace exact text in the complete artifact HTML and rerender the preview automatically.',
                inputSchema: {type: 'object', properties: {revision: {type: 'string'}, oldText: {type: 'string', minLength: 1}, newText: {type: 'string'}, replaceAll: {type: 'boolean'}}, required: ['revision', 'oldText', 'newText'], additionalProperties: false},
                execute: (input, signal) => this.enqueueMutation(signal, draft => replaceInArtifactHtml(draft, input))
            },
            {
                name: 'write_html',
                description: 'Replace the complete artifact HTML document and rerender the preview automatically.',
                inputSchema: {type: 'object', properties: {revision: {type: 'string'}, html: {type: 'string'}}, required: ['revision', 'html'], additionalProperties: false},
                execute: (input, signal) => this.enqueueMutation(signal, draft => writeArtifactHtml(draft, input))
            },
            {
                name: 'inspect',
                description: 'Inspect the rendered artifact page or one element selected by marker or CSS selector.',
                inputSchema: {type: 'object', properties: {marker: {type: 'string', minLength: 1, maxLength: 512}, selector: {type: 'string', minLength: 1, maxLength: 512}}, additionalProperties: false},
                execute: (input, signal) => this.executeInspect(input, signal)
            },
            {
                name: 'screenshot',
                description: 'Capture a bounded screenshot of the rendered artifact preview.',
                inputSchema: {oneOf: [
                    {type: 'object', properties: {kind: {type: 'string', const: 'viewport'}}, required: ['kind'], additionalProperties: false},
                    {type: 'object', properties: {kind: {type: 'string', const: 'full_page'}}, required: ['kind'], additionalProperties: false},
                    {type: 'object', properties: {kind: {type: 'string', const: 'element'}, marker: {type: 'string', minLength: 1, maxLength: 512}}, required: ['kind', 'marker'], additionalProperties: false},
                    {type: 'object', properties: {kind: {type: 'string', const: 'element'}, selector: {type: 'string', minLength: 1, maxLength: 512}}, required: ['kind', 'selector'], additionalProperties: false}
                ]},
                execute: (input, signal) => this.executeScreenshot(input as ScreenshotRequest, signal)
            },
            ...(this.attachments?.getTools(() => this.activeDraft().revision) ?? [])
        ];
    }

    getPreview(): BuilderPreviewAdapter {
        return this.preview;
    }

    getSelectionContext(): BuilderSelectionContext | null {
        this.syncPreviewSelection();
        return structuredClone((this.candidate ?? this.currentDraft)?.selection ?? null);
    }

    getAttachments(): readonly BuilderAttachmentSummary[] {
        return this.attachments?.list() ?? [];
    }

    snapshotAttachments(): BuilderAttachmentSnapshot {
        return this.attachments?.snapshot() ?? {version: 1, attachments: []};
    }

    restoreAttachments(snapshot: BuilderAttachmentSnapshot): void {
        this.attachments?.restore(snapshot);
    }

    async publish(signal: AbortSignal): Promise<PublishResult> {
        await this.flush(signal);
        const draft = this.requireDraft();
        const payload = validateArtifactDraft(draft);
        if (!payload.ok) {
            return {ok: false, revision: draft.revision, error: payload.error};
        }
        if (!this.saveDraft) {
            return {ok: false, revision: draft.revision, error: {code: 'artifact_save_unavailable', message: 'Artifact saving is not connected yet.', retryable: false}};
        }
        await this.saveDraft(artifactPayload(draft), signal);
        abortIfNeeded(signal);
        this.baseline = cloneArtifactDraft(draft);
        this.setState({...this.currentState, dirty: this.isDirty()});
        return {ok: true, revision: draft.revision};
    }

    subscribe(listener: (state: BuilderWorkspaceState) => void): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private activeDraft(): ArtifactDraft {
        return this.candidate ?? this.requireDraft();
    }

    private requireDraft(): ArtifactDraft {
        if (!this.currentDraft) {
            throw new Error('The artifact workspace has not been loaded.');
        }
        return this.currentDraft;
    }

    private async executeRead(signal: AbortSignal, read: () => BuilderToolResult<unknown>): Promise<BuilderToolResult<unknown>> {
        abortIfNeeded(signal);
        await this.flush(signal);
        return read();
    }

    private enqueueMutation(signal: AbortSignal, mutate: (draft: ArtifactDraft) => Promise<ArtifactCandidateResult<unknown>>): Promise<BuilderToolResult<unknown>> {
        const operation = this.mutationTail.then(async () => {
            abortIfNeeded(signal);
            const result = await mutate(cloneArtifactDraft(this.activeDraft()));
            if (!result.ok) {
                return result;
            }
            const validation = await this.preview.renderCandidate(result.candidate, signal);
            if (!validation.valid) {
                return {
                    ok: false as const,
                    revision: this.activeDraft().revision,
                    error: {
                        code: 'artifact_render_failed',
                        message: validation.diagnostics[0]?.message ?? 'The artifact could not render.',
                        retryable: true,
                        details: {diagnostics: validation.diagnostics}
                    }
                };
            }
            const rendered = this.preview.draft && sameSavedPayload(this.preview.draft, result.candidate)
                ? this.preview.draft
                : result.candidate;
            this.candidate = cloneArtifactDraft(rendered);
            this.setState({revision: rendered.revision, dirty: this.isDirty(), validation: {...validation, revision: rendered.revision}});
            return {...result, revision: rendered.revision, data: {...result.data as object, render: {valid: true}}};
        });
        this.mutationTail = operation.then(() => {}, () => {});
        return operation;
    }

    private async executeInspect(input: Record<string, unknown>, signal: AbortSignal): Promise<BuilderToolResult<unknown>> {
        await this.flush(signal);
        const hasMarker = typeof input.marker === 'string' && input.marker.length > 0;
        const hasSelector = typeof input.selector === 'string' && input.selector.length > 0;
        if (hasMarker && hasSelector) {
            return {ok: false, revision: this.activeDraft().revision, error: {code: 'invalid_preview_target', message: 'Inspect by marker or selector, not both.', retryable: false}};
        }
        try {
            const data = hasMarker || hasSelector
                ? await this.preview.inspectElement(hasMarker ? {marker: input.marker as string} : {selector: input.selector as string}, signal)
                : await this.preview.inspectPage(signal);
            return {ok: true, revision: this.activeDraft().revision, data};
        } catch (error) {
            if (isAbortError(error)) {
                throw error;
            }
            return this.previewFailure(error);
        }
    }

    private async executeScreenshot(request: ScreenshotRequest, signal: AbortSignal): Promise<BuilderToolResult<unknown>> {
        await this.flush(signal);
        const hasMarker = request.kind === 'element' && typeof request.marker === 'string' && request.marker.length > 0;
        const hasSelector = request.kind === 'element' && typeof request.selector === 'string' && request.selector.length > 0;
        if (!['viewport', 'full_page', 'element'].includes(request.kind)
            || (request.kind === 'element' && hasMarker === hasSelector)
            || (request.kind !== 'element' && ('marker' in request || 'selector' in request))) {
            return {ok: false, revision: this.activeDraft().revision, error: {code: 'invalid_screenshot_request', message: 'Element screenshots require exactly one marker or selector; other screenshot kinds accept no target.', retryable: false}};
        }
        try {
            const result = screenshotAttachment(await this.preview.screenshot(request, signal));
            return result.ok ? {...result, revision: this.activeDraft().revision} : {...result, revision: this.activeDraft().revision};
        } catch (error) {
            if (isAbortError(error)) {
                throw error;
            }
            return this.previewFailure(error);
        }
    }

    private previewFailure(error: unknown): BuilderToolResult<never> {
        const diagnostic: WorkspaceDiagnostic = {code: 'artifact_preview_failed', message: error instanceof Error ? error.message : String(error), severity: 'error'};
        return {ok: false, revision: this.activeDraft().revision, error: {code: diagnostic.code, message: diagnostic.message, retryable: true}};
    }

    private syncPreviewSelection(): void {
        const previewDraft = this.preview.draft;
        const active = this.candidate ?? this.currentDraft;
        if (!previewDraft || !active || !sameSavedPayload(previewDraft, active)) {
            return;
        }
        if (this.candidate) {
            this.candidate = cloneArtifactDraft(previewDraft);
        } else {
            this.currentDraft = cloneArtifactDraft(previewDraft);
        }
        if (this.currentState.revision !== previewDraft.revision) {
            this.setState({
                ...this.currentState,
                revision: previewDraft.revision,
                dirty: this.isDirty(),
                validation: {valid: true, diagnostics: [], revision: previewDraft.revision}
            });
        }
    }

    private isDirty(): boolean {
        const active = this.candidate ?? this.currentDraft;
        return Boolean(active && this.baseline && !sameSavedPayload(active, this.baseline));
    }

    private setState(state: BuilderWorkspaceState): void {
        this.currentState = state;
        this.listeners.forEach(listener => listener(this.state));
    }
}
