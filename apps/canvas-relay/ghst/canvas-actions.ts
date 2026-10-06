import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { z } from 'zod';
import { callRelay, relayRequest } from './canvas-client.js';
import type { RelayConnection } from './canvas-client.js';
import { GhstError, ExitCode } from './errors.js';

const contextSchema = z.object({
  workspaceId: z.string(),
  revision: z.string(),
  generation: z.number().int().nonnegative(),
});
type Context = z.infer<typeof contextSchema>;
export type CanvasData = Record<string, unknown>;
export const sourcePath = z
  .string()
  .min(1)
  .max(1024)
  .refine(
    (value) =>
      !value.startsWith('/') && !value.split('/').some((part) => part === '..' || part === ''),
    'Use a theme-relative file path',
  );

/** An ordinary CLI action owns capability checks, protocol envelopes and revision guards. */
export async function canvasAction(
  connection: RelayConnection,
  action: string,
  input: CanvasData = {},
  mutation = false,
): Promise<CanvasData> {
  const status = await relayRequest(connection, '/status');
  if (!status.ready || typeof status.epoch !== 'string') {
    throw new GhstError('The paired editor is offline.', { code: 'EDITOR_OFFLINE' });
  }
  const tool = `ghost_canvas_${action}`;
  if (!Array.isArray(status.tools) || !status.tools.some((entry) => entry.name === tool)) {
    throw new GhstError(
      `This editor does not provide canvas ${action}. Run canvas tools to see available actions.`,
      { code: 'ACTION_UNAVAILABLE' },
    );
  }
  const id = randomUUID();
  if (mutation) console.error(`Operation: ${id}`);
  const result = await callRelay(connection, { id, epoch: status.epoch, tool, input });
  if (result.status !== 'completed') {
    throw new GhstError(
      `Operation ${id} is ${result.status}. Run canvas result ${id}; do not repeat the edit.`,
      { code: 'OPERATION_INCOMPLETE', details: result },
    );
  }
  const reply = result.result;
  if (reply?.status !== 'ok') {
    const code = String(reply?.code ?? 'OPERATION_FAILED');
    throw new GhstError(String(reply?.message ?? `Canvas ${action} failed (${code}).`), {
      code,
      exitCode: code === 'stale_revision' ? ExitCode.CONFLICT : ExitCode.GENERAL_ERROR,
      details: reply,
    });
  }
  return (reply.data ?? {}) as CanvasData;
}

async function remember(connection: RelayConnection, file: string, context: Context) {
  const temporary = `${file}.context.${randomUUID()}.tmp`;
  await writeFile(
    temporary,
    JSON.stringify({
      serviceUrl: connection.serviceUrl,
      tenant: connection.tenant,
      session: connection.session,
      context,
    }),
    { mode: 0o600 },
  );
  await rename(temporary, file + '.context.json');
}

export async function canvasState(connection: RelayConnection, file: string): Promise<CanvasData> {
  const data = await canvasAction(connection, 'state');
  await remember(connection, file, contextSchema.parse(data.context));
  return data;
}

export function settingsSummary(settings: CanvasData[]): string {
  return settings
    .map((setting) => {
      const effective = Object.hasOwn(setting, 'stagedValue')
        ? setting.stagedValue
        : Object.hasOwn(setting, 'currentValue')
          ? setting.currentValue
          : setting.value;
      const details = [
        `${String(setting.identifier)} = ${JSON.stringify(effective) ?? 'unavailable'} (${String(setting.type ?? 'unknown')}; ${setting.writable === false ? 'read-only' : 'editable'}; ${setting.visible === false ? 'hidden' : 'visible'})`,
      ];
      details.push(
        `  Default: ${Object.hasOwn(setting, 'defaultValue') ? JSON.stringify(setting.defaultValue) : 'not declared'}`,
      );
      if (Array.isArray(setting.choices))
        details.push(
          `  Choices: ${setting.choices.map((choice) => JSON.stringify(choice)).join(', ')}`,
        );
      if (setting.visibility) details.push(`  Visible when: ${String(setting.visibility)}`);
      if (setting.description) details.push(`  ${String(setting.description)}`);
      if (Array.isArray(setting.truncatedFields) && setting.truncatedFields.length)
        details.push(
          `  Incomplete metadata: ${setting.truncatedFields.join(', ')}. Do not treat these fields as complete.`,
        );
      return details.join('\n');
    })
    .join('\n');
}

export function capabilitySummary(status: CanvasData, state?: CanvasData): CanvasData {
  const tools = (status.tools ?? []) as { name: string }[];
  const editor = state?.editor as CanvasData | undefined;
  const css = editor?.cssEditing as CanvasData | undefined;
  const capabilities = state?.capabilities as CanvasData | undefined;
  return {
    actions: tools.map((tool) => tool.name.replace(/^ghost_canvas_/, '')),
    connected: status.connected,
    ready: status.ready,
    screenshots: tools.some((tool) => /capture|screenshot/.test(tool.name)),
    visualVerification: capabilities?.visualVerification ?? 'not-reported',
    css: css ?? { themeBuilds: 'not-reported' },
    connection: 'Saved by pairing; subsequent commands do not need --url.',
  };
}

export function capabilityText(summary: CanvasData, showActions = true): string {
  const css = summary.css as CanvasData;
  const stylesheets = css.linkedStylesheets as { path: string; mode: string }[] | undefined;
  return [
    ...(showActions ? [`Actions: ${(summary.actions as string[]).join(', ') || 'none'}`] : []),
    `Screenshots: ${summary.screenshots ? 'available' : 'unavailable'}; visual verification: ${String(summary.visualVerification)}`,
    `Theme builds: ${css.themeBuilds === false ? 'unavailable' : String(css.themeBuilds ?? 'not-reported')}. Prefer a directly linked authoring stylesheet.`,
    ...(stylesheets
      ? [
          `Template-linked CSS: ${stylesheets.map((item) => `${item.path} (${item.mode})`).join(', ') || 'none'}`,
        ]
      : []),
    'Generated assets are not rebuilt from source. Source maps must be removed or regenerated when compiled CSS changes.',
    String(summary.connection),
  ].join('\n');
}

export async function contextForEdit(connection: RelayConnection, file: string): Promise<Context> {
  try {
    const saved = JSON.parse(await readFile(file + '.context.json', 'utf8'));
    if (
      saved.serviceUrl === connection.serviceUrl &&
      saved.tenant === connection.tenant &&
      saved.session === connection.session
    ) {
      return contextSchema.parse(saved.context);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return contextSchema.parse((await canvasState(connection, file)).context);
}

export async function canvasRead(
  connection: RelayConnection,
  file: string,
  requests: CanvasData[],
): Promise<CanvasData[]> {
  const context = contextSchema.parse((await canvasAction(connection, 'state')).context);
  const output: CanvasData[] = [];
  for (let start = 0; start < requests.length; start += 8) {
    const batch = requests.slice(start, start + 8);
    const data = await canvasAction(connection, 'read', { context, requests: batch });
    const results = z
      .array(
        z.object({
          status: z.string(),
          data: z.record(z.string(), z.unknown()).optional(),
          code: z.string().optional(),
          message: z.string().optional(),
        }),
      )
      .parse(data.results);
    if (results.length !== batch.length)
      throw new GhstError('The editor returned an incomplete read.');
    for (let index = 0; index < results.length; index++) {
      const result = results[index]!;
      if (result.status !== 'ok')
        throw new GhstError(
          result.message ??
            `Cannot read ${String(batch[index]!.path ?? batch[index]!.operation)} (${result.code}).`,
          { code: result.code, details: result },
        );
      const item = result.data!;
      // The remote bounds excerpts; the CLI assembles complete sources without
      // exposing character-offset pagination to its caller.
      const chunks = typeof item.content === 'string' ? [item.content] : null;
      let previousOffset = Number(batch[index]!.offset ?? 0);
      let nextOffset = item.nextOffset;
      while (typeof nextOffset === 'number') {
        if (nextOffset <= previousOffset)
          throw new GhstError('The editor returned non-advancing pagination.');
        const continuation = await canvasAction(connection, 'read', {
          context,
          requests: [{ ...batch[index], offset: nextOffset }],
        });
        const next = (continuation.results as typeof results)[0];
        if (!next || next.status !== 'ok' || !next.data)
          throw new GhstError(next?.message ?? 'Reading the remaining source failed.', {
            code: next?.code,
            details: next,
          });
        if (chunks) chunks.push(String(next.data.content));
        else {
          for (const key of ['files', 'settings']) {
            if (Array.isArray(item[key]) && Array.isArray(next.data[key]))
              item[key].push(...next.data[key]);
          }
        }
        previousOffset = nextOffset;
        nextOffset = next.data.nextOffset;
      }
      if (chunks) {
        item.content = chunks.join('');
        item.truncated = false;
        item.complete = true;
        item.length = String(item.content).length;
      }
      if (Array.isArray(item.settings)) {
        item.settings = item.settings.map((setting: CanvasData) => ({
          ...setting,
          effectiveValue: Object.hasOwn(setting, 'stagedValue')
            ? setting.stagedValue
            : Object.hasOwn(setting, 'currentValue')
              ? setting.currentValue
              : setting.value,
        }));
      }
      item.nextOffset = null;
      output.push(item);
    }
  }
  // Only a complete successful read becomes the basis for a subsequent write.
  await remember(connection, file, context);
  return output;
}

export function assignment(value: string): [string, string] {
  const separator = value.indexOf('=');
  if (separator <= 0)
    throw new GhstError('Use NAME=VALUE (or THEME_PATH=LOCAL_FILE).', {
      exitCode: ExitCode.USAGE_ERROR,
    });
  return [value.slice(0, separator), value.slice(separator + 1)];
}

export async function canvasEdit(
  connection: RelayConnection,
  file: string,
  patch: CanvasData,
  expectedRevision?: string,
): Promise<CanvasData> {
  const context = await contextForEdit(connection, file);
  if (expectedRevision && expectedRevision !== context.revision)
    throw new GhstError(
      'The expected revision differs from your last read. Read the files again before editing.',
      { code: 'stale_revision', exitCode: ExitCode.CONFLICT },
    );
  const data = await canvasAction(connection, 'edit', { ...patch, context }, true);
  if (!patch.dryRun && typeof data.revision === 'string')
    await remember(connection, file, { ...context, revision: data.revision });
  const summary: CanvasData = {
    files: ((patch.files ?? []) as { path: string; operation: string }[]).map((file) => ({
      path: file.path,
      operation: file.operation,
    })),
    settings: Object.entries((patch.settings ?? {}) as CanvasData).map(([identifier, value]) => ({
      identifier,
      value,
    })),
    status: patch.dryRun ? 'candidate' : data.unchanged ? 'unchanged' : 'accepted',
  };
  if (!patch.dryRun && !data.unchanged) {
    const history = data.history as CanvasData | undefined;
    if (history && history.status !== 'superseded') {
      summary.undoCheckpoint = history.undoCheckpoint ?? null;
      summary.checkpoint = history.checkpoint ?? null;
    } else summary.history = 'Query canvas history for the current undo checkpoint.';
  }
  return { ...data, changes: summary };
}

export function editSummary(data: CanvasData): string {
  const changes = data.changes as CanvasData | undefined;
  const lines: string[] = [];
  if ('valid' in data)
    lines.push(data.valid ? 'Patch valid; draft unchanged.' : 'Patch invalid; draft unchanged.');
  const delivery = data.delivery as CanvasData | undefined;
  const failures = delivery?.failedSurfaces as unknown[] | undefined;
  if (!('valid' in data))
    lines.push(
      `${data.unchanged ? 'No changes.' : 'Draft updated.'} Previews: ${String(delivery?.status ?? 'pending')}${delivery?.ready !== undefined ? ` (${String(delivery.ready)}/${String(delivery.total)})` : ''}.${failures?.length ? ` Failed: ${failures.join(', ')}.` : ''} Not published.`,
    );
  if (changes) {
    lines.push(
      `Files${changes.status === 'accepted' ? '' : ' (proposed)'}: ${(changes.files as { path: string; operation: string }[]).map((file) => `${file.path} (${file.operation})`).join(', ') || 'none'}`,
    );
    lines.push(
      `Settings: ${(changes.settings as { identifier: string; value: unknown }[]).map((setting) => `${setting.identifier}=${JSON.stringify(setting.value)}`).join(', ') || 'none'}`,
    );
    if (changes.undoCheckpoint)
      lines.push(
        `Undo: ghst canvas history restore --checkpoint ${String(changes.undoCheckpoint)}`,
      );
    if (changes.checkpoint) lines.push(`Checkpoint: ${String(changes.checkpoint)}`);
    if (changes.history) lines.push(String(changes.history));
  }
  const validation = data.validation as CanvasData | undefined;
  if (validation)
    lines.push(
      `Validation: source=${String(validation.source)}, renderer=${String(validation.renderer)}, appearance=${String(validation.appearance)}`,
    );
  return lines.join('\n');
}
