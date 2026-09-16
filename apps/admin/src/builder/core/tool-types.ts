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

export type BuilderToolAttachment = {
  type: 'image';
  mediaType: string;
  data: string;
};

export type BuilderToolResult<T> =
  | {
      ok: true;
      revision: string;
      data: T;
      diagnostics?: WorkspaceDiagnostic[];
      attachments?: BuilderToolAttachment[];
    }
  | { ok: false; revision: string; error: BuilderToolError };

export type BuilderToolDefinition<T = unknown> = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>, signal: AbortSignal) => Promise<BuilderToolResult<T>>;
};
