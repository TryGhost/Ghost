export type WorkspaceDiagnostic = {
    code: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    details?: unknown;
};

export type BuilderToolError = {
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
};

export type BuilderToolResult<T> =
    | {ok: true; revision: string; data: T; diagnostics?: WorkspaceDiagnostic[]}
    | {ok: false; revision: string; error: BuilderToolError};

export type BuilderToolDefinition<T = unknown> = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (input: Record<string, unknown>, signal: AbortSignal) => Promise<BuilderToolResult<T>>;
};
