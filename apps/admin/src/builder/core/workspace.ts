import type {BuilderToolDefinition, WorkspaceDiagnostic} from './tool-types';

export type WorkspaceSnapshot = {
    revision: string;
    payload: unknown;
};

export type ValidationResult = {
    valid: boolean;
    diagnostics: WorkspaceDiagnostic[];
    revision: string;
};

export type BuilderWorkspaceState = {
    revision: string;
    dirty: boolean;
    validation: ValidationResult | null;
};

export type BuilderPreviewAdapter = {
    kind: string;
    clearSelection?: () => Promise<void> | void;
};

export type BuilderSelectionContext = {
    id: string;
    label: string;
    data?: unknown;
};

export type PublishResult =
    | {ok: true; revision: string}
    | {ok: false; revision: string; error: {code: string; message: string; retryable: boolean; details?: unknown}};

export interface BuilderWorkspace {
    readonly id: string;
    readonly kind: string;
    readonly title: string;
    load(signal: AbortSignal): Promise<void>;
    flush?(signal: AbortSignal): Promise<void>;
    snapshot(): WorkspaceSnapshot;
    checkpointSnapshot?(): WorkspaceSnapshot;
    restore(snapshot: WorkspaceSnapshot): Promise<ValidationResult>;
    promoteCandidate(signal: AbortSignal): Promise<ValidationResult>;
    getTools(): BuilderToolDefinition[];
    getPreview(): BuilderPreviewAdapter;
    getSelectionContext(): BuilderSelectionContext | null;
    publish(signal: AbortSignal): Promise<PublishResult>;
    subscribe(listener: (state: BuilderWorkspaceState) => void): () => void;
}
