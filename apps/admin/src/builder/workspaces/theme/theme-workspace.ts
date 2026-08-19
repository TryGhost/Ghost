import type {BuilderToolDefinition} from '@/builder/core/tool-types';
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

import type {ThemeDraft} from './theme-state';

type ThemePublishAdapterResult = PublishResult & {draft?: ThemeDraft};

type ThemeWorkspaceOptions = {
    id: string;
    title: string;
    load: (signal: AbortSignal) => Promise<ThemeDraft>;
    preview: BuilderPreviewAdapter;
    publish?: (draft: ThemeDraft, signal: AbortSignal) => Promise<ThemePublishAdapterResult>;
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
        && Array.isArray(value.renderer.missing)
        && value.renderer.missing.every(item => typeof item === 'string')
        && typeof value.virtualUrl === 'string';
}

export class ThemeWorkspace implements BuilderWorkspace {
    readonly id: string;
    readonly kind = 'theme';
    readonly title: string;

    private readonly loadDraft: ThemeWorkspaceOptions['load'];
    private readonly preview: BuilderPreviewAdapter;
    private readonly publishDraft?: ThemeWorkspaceOptions['publish'];
    private readonly listeners = new Set<(state: BuilderWorkspaceState) => void>();
    private currentDraft: ThemeDraft | null = null;
    private baselinePublishRevision = '';
    private currentState = unloadedState;

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

    async load(signal: AbortSignal): Promise<void> {
        abortIfNeeded(signal);
        const draft = await this.loadDraft(signal);
        abortIfNeeded(signal);
        this.currentDraft = cloneThemeDraft(draft);
        this.baselinePublishRevision = await themePublishRevision(draft);
        this.setState({
            revision: draft.revision,
            dirty: false,
            validation: {valid: true, diagnostics: [], revision: draft.revision}
        });
    }

    snapshot(): WorkspaceSnapshot {
        const draft = this.requireDraft();
        return {revision: draft.revision, payload: cloneThemeDraft(draft)};
    }

    async restore(snapshot: WorkspaceSnapshot): Promise<ValidationResult> {
        if (!isThemeDraft(snapshot.payload)) {
            return this.invalidSnapshot('snapshot_invalid', 'The Builder checkpoint is not a theme draft.');
        }
        const revised = await withThemeRevision(snapshot.payload);
        if (revised.revision !== snapshot.revision || snapshot.payload.revision !== snapshot.revision) {
            return this.invalidSnapshot('snapshot_revision_mismatch', 'The Builder checkpoint revision does not match its contents.');
        }
        this.currentDraft = cloneThemeDraft(revised);
        const publishRevision = await themePublishRevision(revised);
        const validation = {valid: true, diagnostics: [], revision: revised.revision};
        this.setState({revision: revised.revision, dirty: publishRevision !== this.baselinePublishRevision, validation});
        return validation;
    }

    promoteCandidate(signal: AbortSignal): Promise<ValidationResult> {
        return Promise.resolve().then(() => {
            abortIfNeeded(signal);
            const draft = this.requireDraft();
            return {valid: true, diagnostics: [], revision: draft.revision};
        });
    }

    getTools(): BuilderToolDefinition[] {
        return [];
    }

    getPreview(): BuilderPreviewAdapter {
        return this.preview;
    }

    getSelectionContext(): BuilderSelectionContext | null {
        return this.currentDraft?.selection ? structuredClone(this.currentDraft.selection) : null;
    }

    async publish(signal: AbortSignal): Promise<PublishResult> {
        abortIfNeeded(signal);
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
            this.baselinePublishRevision = await themePublishRevision(publishedDraft);
            const validation = {valid: true, diagnostics: [], revision: publishedDraft.revision};
            this.setState({revision: publishedDraft.revision, dirty: false, validation});
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

    private invalidSnapshot(code: string, message: string): ValidationResult {
        const revision = this.currentDraft?.revision ?? '';
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
