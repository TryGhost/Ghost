import type {BuilderToolDefinition, BuilderToolResult, WorkspaceDiagnostic} from '@/builder/core/tool-types';
import type {
    BuilderPreviewAdapter,
    BuilderSelectionContext,
    BuilderWorkspace,
    BuilderWorkspaceState,
    PublishResult,
    ValidationResult,
    WorkspaceSnapshot
} from '@/builder/core/workspace';
import {cloneThemeDraft, themePublishRevision, withThemeRevision} from './theme-state';
import {listDesignSettings, updateDesignSettings} from './design-setting-tools';
import {
    deleteThemeFile,
    listThemeFiles,
    readThemeFile,
    replaceInThemeFile,
    searchThemeFiles,
    writeThemeFile
} from './theme-tools';

import type {ThemeDraft} from './theme-state';
import type {ThemeCandidateResult} from './theme-tools';
import {PreviewInspectionError} from './preview/preview-inspection';

import type {PreviewElementInspection, PreviewElementTarget, PreviewPageInspection} from './preview/preview-inspection';
import type {ThemeNavigationResult} from './preview/theme-preview-adapter';
import type {ScreenshotRequest, ScreenshotResult} from './preview/screenshot';

type ThemePublishAdapterResult = PublishResult & {draft?: ThemeDraft};

type ThemeWorkspaceOptions = {
    id: string;
    title: string;
    load: (signal: AbortSignal) => Promise<ThemeDraft>;
    preview: ThemeMutationPreview;
    publish?: (draft: ThemeDraft, signal: AbortSignal) => Promise<ThemePublishAdapterResult>;
};

type ThemeMutationPreview = BuilderPreviewAdapter & {
    renderCandidate?: (draft: ThemeDraft, signal: AbortSignal) => Promise<ValidationResult>;
    restoreDraft?: (draft: ThemeDraft, signal: AbortSignal) => Promise<ValidationResult>;
    rebaseDraft?: (draft: ThemeDraft) => void;
    inspectPage?: (signal: AbortSignal) => Promise<PreviewPageInspection & {diagnostics: WorkspaceDiagnostic[]; diagnosticsTruncated: boolean}>;
    inspectElement?: (target: PreviewElementTarget, signal: AbortSignal) => Promise<PreviewElementInspection>;
    navigate?: (target: string, signal: AbortSignal) => Promise<ThemeNavigationResult>;
    screenshot?: (request: ScreenshotRequest, signal: AbortSignal) => Promise<ScreenshotResult>;
    readonly draft?: ThemeDraft;
    readonly state?: {url?: string};
};

type MutationRenderData = {
    render: {valid: true; url?: string};
};

type ThemeCheckpointPayload = {
    promoted: ThemeDraft;
    candidate: ThemeDraft | null;
};

const unloadedState: BuilderWorkspaceState = {
    revision: '',
    dirty: false,
    validation: null
};

function abortIfNeeded(signal: AbortSignal): void {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUint8Array(value: unknown): value is Uint8Array {
    return ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === '[object Uint8Array]';
}

function valuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
        return true;
    }
    if (isUint8Array(left) || isUint8Array(right)) {
        return isUint8Array(left)
            && isUint8Array(right)
            && left.byteLength === right.byteLength
            && left.every((byte, index) => byte === right[index]);
    }
    if (Array.isArray(left) || Array.isArray(right)) {
        return Array.isArray(left)
            && Array.isArray(right)
            && left.length === right.length
            && left.every((value, index) => valuesEqual(value, right[index]));
    }
    if (!isRecord(left) || !isRecord(right)) {
        return false;
    }
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
        && leftKeys.every((key, index) => key === rightKeys[index] && valuesEqual(left[key], right[key]));
}

function hasOnlyPreviewStateChanges(left: ThemeDraft, right: ThemeDraft): boolean {
    return valuesEqual(
        {
            theme: left.theme,
            files: left.files,
            globalSettings: left.globalSettings,
            customSettings: left.customSettings,
            renderer: left.renderer
        },
        {
            theme: right.theme,
            files: right.files,
            globalSettings: right.globalSettings,
            customSettings: right.customSettings,
            renderer: right.renderer
        }
    );
}

function isThemeDraft(value: unknown): value is ThemeDraft {
    if (!isRecord(value) || !isRecord(value.theme) || !isRecord(value.files) || !isRecord(value.globalSettings) || !isRecord(value.customSettings) || !isRecord(value.renderer)) {
        return false;
    }
    const filesAreValid = Object.entries(value.files).every(([path, file]) => {
        if (!isRecord(file)) {
            return false;
        }
        return file.path === path
            && (file.kind === 'text' || file.kind === 'binary')
            && (typeof file.content === 'string' || file.content === null)
            && (isUint8Array(file.binary) || file.binary === null);
    });
    const selectionIsValid = value.selection === null || (isRecord(value.selection) && typeof value.selection.id === 'string' && typeof value.selection.label === 'string');
    return filesAreValid
        && selectionIsValid
        && typeof value.revision === 'string'
        && typeof value.theme.name === 'string'
        && typeof value.theme.version === 'string'
        && typeof value.theme.builtIn === 'boolean'
        && typeof value.theme.rootPrefix === 'string'
        && typeof value.renderer.siteUrl === 'string'
        && typeof value.renderer.contentApiKey === 'string'
        && isRecord(value.renderer.config)
        && (value.renderer.settingsPayload === undefined || isRecord(value.renderer.settingsPayload))
        && Array.isArray(value.renderer.missing)
        && value.renderer.missing.every(item => typeof item === 'string')
        && typeof value.virtualUrl === 'string';
}

function isThemeCheckpointPayload(value: unknown): value is ThemeCheckpointPayload {
    return isRecord(value)
        && isThemeDraft(value.promoted)
        && (value.candidate === null || isThemeDraft(value.candidate));
}

export class ThemeWorkspace implements BuilderWorkspace {
    readonly id: string;
    readonly kind = 'theme';
    readonly title: string;

    private readonly loadDraft: ThemeWorkspaceOptions['load'];
    private readonly preview: ThemeMutationPreview;
    private readonly publishDraft?: ThemeWorkspaceOptions['publish'];
    private readonly listeners = new Set<(state: BuilderWorkspaceState) => void>();
    private currentDraft: ThemeDraft | null = null;
    private lastValidCandidate: ThemeDraft | null = null;
    private baselineDraft: ThemeDraft | null = null;
    private baselinePublishRevision = '';
    private currentState = unloadedState;
    private mutationTail: Promise<void> = Promise.resolve();

    constructor({id, title, load, preview, publish}: ThemeWorkspaceOptions) {
        this.id = id;
        this.title = title;
        this.loadDraft = load;
        this.preview = preview;
        this.publishDraft = publish;
    }

    get draft(): ThemeDraft {
        if (!this.currentDraft) {
            throw new Error('The theme workspace has not been loaded.');
        }
        return cloneThemeDraft(this.currentDraft);
    }

    get candidateDraft(): ThemeDraft | null {
        return this.lastValidCandidate ? cloneThemeDraft(this.lastValidCandidate) : null;
    }

    async load(signal: AbortSignal): Promise<void> {
        abortIfNeeded(signal);
        const draft = await this.loadDraft(signal);
        abortIfNeeded(signal);
        this.currentDraft = cloneThemeDraft(draft);
        this.lastValidCandidate = null;
        this.baselineDraft = cloneThemeDraft(draft);
        this.baselinePublishRevision = await themePublishRevision(draft);
        this.setState({
            revision: draft.revision,
            dirty: false,
            validation: {valid: true, diagnostics: [], revision: draft.revision}
        });
    }

    snapshot(): WorkspaceSnapshot {
        this.syncPreviewOnlyDraft();
        const draft = this.requireDraft();
        return {revision: draft.revision, payload: cloneThemeDraft(draft)};
    }

    checkpointSnapshot(): WorkspaceSnapshot {
        this.syncPreviewOnlyDraft();
        const promoted = this.requireDraft();
        const candidate = this.lastValidCandidate;
        return {
            revision: candidate?.revision ?? promoted.revision,
            payload: {
                promoted: cloneThemeDraft(promoted),
                candidate: candidate ? cloneThemeDraft(candidate) : null
            } satisfies ThemeCheckpointPayload
        };
    }

    async restore(snapshot: WorkspaceSnapshot): Promise<ValidationResult> {
        await this.mutationTail;
        this.syncPreviewOnlyDraft();
        const checkpoint = isThemeCheckpointPayload(snapshot.payload) ? snapshot.payload : null;
        const promotedPayload = checkpoint?.promoted ?? snapshot.payload;
        const activePayload = checkpoint?.candidate ?? promotedPayload;
        if (!isThemeDraft(promotedPayload) || !isThemeDraft(activePayload)) {
            return this.invalidSnapshot('snapshot_invalid', 'The Builder checkpoint is not a theme draft.');
        }
        const promoted = await withThemeRevision(promotedPayload);
        const revised = checkpoint?.candidate ? await withThemeRevision(checkpoint.candidate) : promoted;
        const revisionsMatch = promoted.revision === promotedPayload.revision
            && revised.revision === snapshot.revision
            && activePayload.revision === snapshot.revision;
        if (!revisionsMatch) {
            return this.invalidSnapshot('snapshot_revision_mismatch', 'The Builder checkpoint revision does not match its contents.');
        }
        let adopted = revised;
        let validation: ValidationResult = {valid: true, diagnostics: [], revision: revised.revision};
        const restorePreview = this.preview.restoreDraft ?? this.preview.renderCandidate;
        if (restorePreview) {
            try {
                validation = await restorePreview.call(this.preview, cloneThemeDraft(revised), new AbortController().signal);
            } catch (error) {
                return this.invalidSnapshot('snapshot_preview_failed', error instanceof Error ? error.message : String(error));
            }
            if (!validation.valid) {
                this.setState({...this.currentState, validation: {...validation, revision: this.requireActiveDraft().revision}});
                return {...validation, revision: this.requireActiveDraft().revision};
            }
            if (validation.revision !== snapshot.revision) {
                return this.invalidSnapshot('snapshot_preview_revision_mismatch', 'The preview could not restore the exact checkpoint revision.');
            }
            const previewDraft = this.preview.draft;
            adopted = previewDraft?.revision === validation.revision ? previewDraft : revised;
            if (adopted.revision !== validation.revision) {
                return this.invalidSnapshot('snapshot_preview_revision_mismatch', 'The preview restored a different theme revision.');
            }
        }
        this.currentDraft = cloneThemeDraft(checkpoint?.candidate ? promoted : adopted);
        this.lastValidCandidate = checkpoint?.candidate ? cloneThemeDraft(adopted) : null;
        const publishRevision = await themePublishRevision(adopted);
        validation = {...validation, revision: adopted.revision};
        this.setState({revision: adopted.revision, dirty: publishRevision !== this.baselinePublishRevision, validation});
        return validation;
    }

    promoteCandidate(signal: AbortSignal): Promise<ValidationResult> {
        return this.mutationTail.then(() => {
            abortIfNeeded(signal);
            this.syncPreviewOnlyDraft();
            if (this.lastValidCandidate) {
                this.currentDraft = cloneThemeDraft(this.lastValidCandidate);
                this.lastValidCandidate = null;
            }
            const draft = this.requireDraft();
            const validation = {valid: true, diagnostics: [], revision: draft.revision};
            this.setState({...this.currentState, revision: draft.revision, validation});
            return validation;
        });
    }

    getTools(): BuilderToolDefinition[] {
        return [
            {
                name: 'list_files',
                description: 'List all files in the current theme with text or binary classification and byte size.',
                inputSchema: {type: 'object', properties: {}, additionalProperties: false},
                execute: () => Promise.resolve(listThemeFiles(this.activeDraftForRead()))
            },
            {
                name: 'search_files',
                description: 'Search text theme files with a literal or regular-expression query.',
                inputSchema: {
                    type: 'object',
                    properties: {query: {type: 'string'}, regex: {type: 'boolean'}},
                    required: ['query'],
                    additionalProperties: false
                },
                execute: input => Promise.resolve(searchThemeFiles(this.activeDraftForRead(), input))
            },
            {
                name: 'read_file',
                description: 'Read a bounded line range from one text theme file.',
                inputSchema: {
                    type: 'object',
                    properties: {path: {type: 'string'}, startLine: {type: 'integer', minimum: 1}, startColumn: {type: 'integer', minimum: 1}, endLine: {type: 'integer', minimum: 1}},
                    required: ['path'],
                    additionalProperties: false
                },
                execute: input => Promise.resolve(readThemeFile(this.activeDraftForRead(), input))
            },
            {
                name: 'replace_in_file',
                description: 'Replace one exact, unambiguous text occurrence in a revision-checked theme file.',
                inputSchema: mutationSchema({oldText: {type: 'string'}, newText: {type: 'string'}}, ['oldText', 'newText']),
                execute: (input, signal) => this.enqueueMutation(signal, draft => replaceInThemeFile(draft, {
                    revision: input.revision as string,
                    path: input.path as string,
                    oldText: input.oldText,
                    newText: input.newText
                }))
            },
            {
                name: 'write_file',
                description: 'Create or replace one text theme file at a safe revision-checked path.',
                inputSchema: mutationSchema({content: {type: 'string'}}, ['content']),
                execute: (input, signal) => this.enqueueMutation(signal, draft => writeThemeFile(draft, {
                    revision: input.revision as string,
                    path: input.path as string,
                    content: input.content
                }))
            },
            {
                name: 'delete_file',
                description: 'Delete one file from the revision-checked theme candidate.',
                inputSchema: mutationSchema(),
                execute: (input, signal) => this.enqueueMutation(signal, draft => deleteThemeFile(draft, {
                    revision: input.revision as string,
                    path: input.path as string
                }))
            },
            {
                name: 'list_design_settings',
                description: 'List readable global and visible theme settings, including staged values and writability.',
                inputSchema: {type: 'object', properties: {}, additionalProperties: false},
                execute: () => Promise.resolve(listDesignSettings(this.activeDraftForRead(), this.baselineDraft ?? this.requireDraft()))
            },
            {
                name: 'update_design_settings',
                description: 'Stage one or more writable global or visible theme settings against the current revision.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        revision: {type: 'string'},
                        values: {type: 'object', minProperties: 1, additionalProperties: {type: ['string', 'boolean', 'null']}}
                    },
                    required: ['revision', 'values'],
                    additionalProperties: false
                },
                execute: (input, signal) => this.enqueueMutation(signal, draft => updateDesignSettings(draft, {revision: input.revision, values: input.values}))
            },
            {
                name: 'inspect_page',
                description: 'Inspect the current preview URL, title, accessibility outline, bounded page text, viewport, and diagnostics.',
                inputSchema: {type: 'object', properties: {}, additionalProperties: false},
                execute: (_input, signal) => this.executePreviewRead(signal, 'inspect_page', preview => preview.inspectPage?.(signal))
            },
            {
                name: 'inspect_element',
                description: 'Inspect one accessible preview element by source marker or selector with bounded attributes, styles, text, box, and source origin.',
                inputSchema: {
                    type: 'object',
                    properties: {marker: {type: 'string', minLength: 1, maxLength: 512}, selector: {type: 'string', minLength: 1, maxLength: 512}},
                    oneOf: [{required: ['marker']}, {required: ['selector']}],
                    additionalProperties: false
                },
                execute: (input, signal) => this.executePreviewRead(signal, 'inspect_element', preview => preview.inspectElement?.({marker: input.marker as string | undefined, selector: input.selector as string | undefined}, signal))
            },
            {
                name: 'navigate',
                description: 'Navigate the preview virtually to a same-site URL without leaving Builder.',
                inputSchema: {
                    type: 'object',
                    properties: {url: {type: 'string', minLength: 1, maxLength: 8_192}},
                    required: ['url'],
                    additionalProperties: false
                },
                execute: (input, signal) => this.executeNavigation(input.url, signal)
            },
            {
                name: 'screenshot',
                description: 'Capture a bounded viewport, full-page, or source-marker/selector element screenshot of the current preview.',
                inputSchema: {
                    oneOf: [
                        {type: 'object', properties: {kind: {type: 'string', const: 'viewport'}}, required: ['kind'], additionalProperties: false},
                        {type: 'object', properties: {kind: {type: 'string', const: 'full_page'}}, required: ['kind'], additionalProperties: false},
                        {type: 'object', properties: {kind: {type: 'string', const: 'element'}, marker: {type: 'string', minLength: 1, maxLength: 512}}, required: ['kind', 'marker'], additionalProperties: false},
                        {type: 'object', properties: {kind: {type: 'string', const: 'element'}, selector: {type: 'string', minLength: 1, maxLength: 512}}, required: ['kind', 'selector'], additionalProperties: false}
                    ]
                },
                execute: (input, signal) => this.executeScreenshot(input, signal)
            }
        ];
    }

    getPreview(): BuilderPreviewAdapter {
        return this.preview;
    }

    getSelectionContext(): BuilderSelectionContext | null {
        this.syncPreviewOnlyDraft();
        const draft = this.lastValidCandidate ?? this.currentDraft;
        return draft?.selection ? structuredClone(draft.selection) : null;
    }

    async publish(signal: AbortSignal): Promise<PublishResult> {
        abortIfNeeded(signal);
        this.syncPreviewOnlyDraft();
        const draft = this.requireDraft();
        if (!this.publishDraft) {
            return {
                ok: false,
                revision: draft.revision,
                error: {code: 'publish_unavailable', message: 'Theme publishing is not connected yet.', retryable: false}
            };
        }
        const result = await this.publishDraft(cloneThemeDraft(draft), signal);
        if (result.ok) {
            const publishedDraft = await withThemeRevision(result.draft ?? draft);
            if (publishedDraft.revision !== result.revision) {
                return {
                    ok: false,
                    revision: draft.revision,
                    error: {
                        code: 'publish_revision_mismatch',
                        message: 'The published theme does not match the returned revision. Reload the Builder before continuing.',
                        retryable: true
                    }
                };
            }
            this.currentDraft = cloneThemeDraft(publishedDraft);
            this.baselineDraft = cloneThemeDraft(publishedDraft);
            this.baselinePublishRevision = await themePublishRevision(publishedDraft);
            if (this.lastValidCandidate) {
                this.lastValidCandidate = await withThemeRevision({
                    ...this.lastValidCandidate,
                    theme: structuredClone(publishedDraft.theme)
                });
                this.preview.rebaseDraft?.(cloneThemeDraft(this.lastValidCandidate));
            }
            const activeDraft = this.lastValidCandidate ?? publishedDraft;
            const activePublishRevision = await themePublishRevision(activeDraft);
            const previousValidation = this.lastValidCandidate
                ? this.currentState.validation ?? {valid: true, diagnostics: [], revision: activeDraft.revision}
                : {valid: true, diagnostics: [], revision: publishedDraft.revision};
            const validation = {...previousValidation, revision: activeDraft.revision};
            this.setState({revision: activeDraft.revision, dirty: activePublishRevision !== this.baselinePublishRevision, validation});
            return {ok: true, revision: publishedDraft.revision};
        }
        return result;
    }

    subscribe(listener: (state: BuilderWorkspaceState) => void): () => void {
        this.listeners.add(listener);
        listener(this.currentState);
        return () => this.listeners.delete(listener);
    }

    private requireDraft(): ThemeDraft {
        if (!this.currentDraft) {
            throw new Error('The theme workspace has not been loaded.');
        }
        return this.currentDraft;
    }

    private requireActiveDraft(): ThemeDraft {
        return this.lastValidCandidate ?? this.requireDraft();
    }

    private activeDraftForRead(): ThemeDraft {
        this.syncPreviewOnlyDraft();
        return this.requireActiveDraft();
    }

    private async executePreviewRead<T>(
        signal: AbortSignal,
        tool: string,
        operation: (preview: ThemeMutationPreview) => Promise<T> | undefined
    ): Promise<BuilderToolResult<T>> {
        abortIfNeeded(signal);
        const revision = this.activeDraftForRead().revision;
        try {
            const pending = operation(this.preview);
            if (!pending) {
                return this.previewToolFailure(revision, 'preview_unavailable', `The preview does not support ${tool}.`, true);
            }
            const data = await pending;
            abortIfNeeded(signal);
            this.syncPreviewOnlyDraft();
            return {ok: true, revision: this.requireActiveDraft().revision, data};
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
            }
            const fallbackCode = tool === 'screenshot' ? 'preview_screenshot_failed' : tool === 'navigate' ? 'preview_navigation_failed' : 'preview_inspection_failed';
            const code = error instanceof PreviewInspectionError ? error.code : fallbackCode;
            return this.previewToolFailure(revision, code, error instanceof Error ? error.message : String(error), code === fallbackCode);
        }
    }

    private async executeNavigation(target: unknown, signal: AbortSignal): Promise<BuilderToolResult<{url: string; status: number}>> {
        const revision = this.activeDraftForRead().revision;
        if (typeof target !== 'string' || !target || target.length > 8_192) {
            return this.previewToolFailure(revision, 'invalid_navigation_target', 'Provide a non-empty preview URL under 8192 characters.', false);
        }
        const result = await this.executePreviewRead(signal, 'navigate', preview => preview.navigate?.(target, signal));
        if (!result.ok) {
            return result;
        }
        if (result.data.kind !== 'virtual') {
            const diagnostic = result.data.kind === 'failed' ? result.data.diagnostics[0] : undefined;
            return this.previewToolFailure(result.revision, diagnostic?.code ?? 'preview_navigation_blocked', diagnostic?.message ?? 'Agent navigation must stay on this site.', false, {url: result.data.url});
        }
        return {ok: true, revision: result.revision, data: {url: result.data.url, status: result.data.status}};
    }

    private async executeScreenshot(input: Record<string, unknown>, signal: AbortSignal): Promise<BuilderToolResult<Omit<ScreenshotResult, 'dataUrl'>>> {
        const revision = this.activeDraftForRead().revision;
        if (!['viewport', 'full_page', 'element'].includes(String(input.kind))) {
            return this.previewToolFailure(revision, 'invalid_screenshot_request', 'Screenshot kind must be viewport, full_page, or element.', false);
        }
        const hasMarker = typeof input.marker === 'string' && input.marker.length > 0;
        const hasSelector = typeof input.selector === 'string' && input.selector.length > 0;
        if ((input.kind === 'element' && hasMarker === hasSelector) || (input.kind !== 'element' && (input.marker !== undefined || input.selector !== undefined))) {
            return this.previewToolFailure(revision, 'invalid_screenshot_request', 'Element screenshots require exactly one marker or selector; other screenshot kinds accept no target.', false);
        }
        const request = input.kind === 'element'
            ? {kind: 'element' as const, marker: input.marker as string | undefined, selector: input.selector as string | undefined}
            : {kind: input.kind as 'viewport' | 'full_page'};
        const result = await this.executePreviewRead(signal, 'screenshot', preview => preview.screenshot?.(request, signal));
        if (!result.ok) {
            return result;
        }
        const prefix = 'data:image/png;base64,';
        if (!result.data.dataUrl.startsWith(prefix)) {
            return this.previewToolFailure(result.revision, 'preview_screenshot_failed', 'The preview returned an invalid screenshot image.', true);
        }
        return {
            ok: true,
            revision: result.revision,
            data: {width: result.data.width, height: result.data.height, warnings: result.data.warnings},
            attachments: [{type: 'image', mediaType: 'image/png', data: result.data.dataUrl.slice(prefix.length)}]
        };
    }

    private previewToolFailure(revision: string, code: string, message: string, retryable: boolean, details?: unknown): Extract<BuilderToolResult<never>, {ok: false}> {
        return {ok: false, revision, error: {code, message, retryable, ...(details === undefined ? {} : {details})}};
    }

    private syncPreviewOnlyDraft(): void {
        let previewDraft: ThemeDraft;
        try {
            const available = this.preview.draft;
            if (!available) {
                return;
            }
            previewDraft = available;
        } catch {
            return;
        }
        const active = this.lastValidCandidate ?? this.currentDraft;
        if (!active || previewDraft.revision === active.revision) {
            return;
        }
        if (!hasOnlyPreviewStateChanges(previewDraft, active)) {
            return;
        }
        if (this.lastValidCandidate) {
            this.lastValidCandidate = cloneThemeDraft(previewDraft);
        } else {
            this.currentDraft = cloneThemeDraft(previewDraft);
        }
        const validation = this.currentState.validation
            ? {...this.currentState.validation, revision: previewDraft.revision}
            : {valid: true, diagnostics: [], revision: previewDraft.revision};
        this.setState({...this.currentState, revision: previewDraft.revision, validation});
    }

    private enqueueMutation<T extends Record<string, unknown>>(
        signal: AbortSignal,
        operation: (draft: ThemeDraft) => Promise<ThemeCandidateResult<T>>
    ): Promise<BuilderToolResult<T & MutationRenderData>> {
        const queued = this.mutationTail.then(async () => {
            abortIfNeeded(signal);
            this.syncPreviewOnlyDraft();
            const source = this.requireActiveDraft();
            const result = await operation(source);
            if (!result.ok) {
                return result;
            }
            abortIfNeeded(signal);
            if (!this.preview.renderCandidate) {
                return {
                    ok: false as const,
                    revision: source.revision,
                    error: {
                        code: 'preview_unavailable',
                        message: 'The preview is not ready to validate theme changes. Reopen Builder and retry.',
                        retryable: true
                    }
                };
            }
            let validation: ValidationResult;
            try {
                validation = await this.preview.renderCandidate(cloneThemeDraft(result.candidate), signal);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    throw error;
                }
                return {
                    ok: false as const,
                    revision: source.revision,
                    error: {
                        code: 'preview_failed',
                        message: 'The preview could not validate this change. Retry after the preview reconnects.',
                        retryable: true,
                        details: {message: error instanceof Error ? error.message : String(error)}
                    }
                };
            }
            if (!validation.valid) {
                const rejectedValidation = {...validation, revision: source.revision};
                this.setState({...this.currentState, validation: rejectedValidation});
                return {
                    ok: false as const,
                    revision: source.revision,
                    error: {
                        code: 'render_invalid',
                        message: 'The change did not produce a valid preview. Repair the reported diagnostics and retry.',
                        retryable: true,
                        details: {diagnostics: validation.diagnostics}
                    }
                };
            }
            if (this.requireActiveDraft().revision !== source.revision) {
                return {
                    ok: false as const,
                    revision: this.requireActiveDraft().revision,
                    error: {
                        code: 'stale_revision',
                        message: 'The theme changed while the candidate was rendering. Read the latest revision and retry.',
                        retryable: true,
                        details: {currentRevision: this.requireActiveDraft().revision}
                    }
                };
            }
            const previewDraft = this.preview.draft;
            const adopted = previewDraft?.revision === validation.revision ? previewDraft : result.candidate;
            if (adopted.revision !== validation.revision) {
                return {
                    ok: false as const,
                    revision: source.revision,
                    error: {
                        code: 'render_revision_mismatch',
                        message: 'The preview validated a different theme revision. Reload Builder before continuing.',
                        retryable: true
                    }
                };
            }
            this.lastValidCandidate = cloneThemeDraft(adopted);
            const publishRevision = await themePublishRevision(adopted);
            const adoptedValidation = {...validation, revision: adopted.revision};
            this.setState({revision: adopted.revision, dirty: publishRevision !== this.baselinePublishRevision, validation: adoptedValidation});
            const url = this.preview.state?.url;
            return {
                ok: true as const,
                revision: adopted.revision,
                data: {...result.data, render: {valid: true as const, ...(url ? {url} : {})}},
                ...(validation.diagnostics.length ? {diagnostics: validation.diagnostics} : {})
            };
        });
        this.mutationTail = queued.then(() => {}, () => {});
        return queued;
    }

    private invalidSnapshot(code: string, message: string): ValidationResult {
        const revision = this.lastValidCandidate?.revision ?? this.currentDraft?.revision ?? '';
        const validation: ValidationResult = {
            valid: false,
            diagnostics: [{code, message, severity: 'error'}],
            revision
        };
        this.setState({...this.currentState, validation});
        return validation;
    }

    private setState(state: BuilderWorkspaceState): void {
        this.currentState = state;
        this.listeners.forEach(listener => listener(state));
    }
}

function mutationSchema(properties: Record<string, unknown> = {}, required: string[] = []): Record<string, unknown> {
    return {
        type: 'object',
        properties: {
            revision: {type: 'string'},
            path: {type: 'string'},
            ...properties
        },
        required: ['revision', 'path', ...required],
        additionalProperties: false
    };
}
