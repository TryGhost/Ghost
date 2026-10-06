import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { Command } from 'commander';
import { getGlobalOptions } from '../lib/context.js';
import { resolveConnectionConfig } from '../lib/config.js';
import { printJson } from '../lib/output.js';
import { GhstError, ExitCode } from '../lib/errors.js';
import { callRelay, relayRequest, validateServiceUrl } from '../lib/canvas-client.js';
import type { RelayConnection } from '../lib/canvas-client.js';
import {
  assignment,
  canvasAction,
  canvasState,
  canvasRead,
  canvasEdit,
  contextForEdit,
  editSummary,
  sourcePath,
  settingsSummary,
  capabilitySummary,
  capabilityText,
} from '../lib/canvas-actions.js';
import type { CanvasData } from '../lib/canvas-actions.js';

type SavedConnection = RelayConnection & { pollSecret?: string; expiresAt?: number };
const defaultConnection =
  process.env.GHST_CANVAS_CONNECTION ?? join(homedir(), '.config', 'ghst', 'canvas.json');
const delay = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 500);
  });
const save = async (file: string, value: unknown, create = false) => {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n', {
    mode: 0o600,
    flag: create ? 'wx' : 'w',
  });
  await chmod(file, 0o600);
};
async function waitForPairing(connection: SavedConnection, file: string) {
  while (Date.now() < (connection.expiresAt ?? 0)) {
    const status = await relayRequest({ ...connection, token: connection.pollSecret! }, '/pairing');
    if (status.status === 'approved' && typeof status.token === 'string') {
      const approved: RelayConnection = { ...connection, token: status.token };
      delete (approved as SavedConnection).pollSecret;
      delete (approved as SavedConnection).expiresAt;
      await save(file, approved);
      for (let attempt = 0; attempt < 40; attempt++) {
        const editor = await relayRequest(approved, '/status');
        if (editor.ready) {
          return {
            status: 'connected',
            connectionFile: file,
            tools: (editor.tools as { name: string }[]).map((tool) => tool.name),
          };
        }
        await delay();
      }
      throw new GhstError(
        'Pairing approved, but the editor did not connect. Check the editor, then run canvas status.',
        { code: 'EDITOR_OFFLINE' },
      );
    }
    await delay();
  }
  throw new GhstError('Pairing expired. Run canvas connect again with a new connection file.', {
    code: 'PAIRING_EXPIRED',
  });
}

export function registerCanvasCommands(program: Command): void {
  const canvas = program
    .command('canvas')
    .description('Edit the open Ghost theme with live previews');
  canvas
    .command('connect')
    .option('--connection <file>', 'Private connection file', defaultConnection)
    .option('--no-wait', 'Create a pairing and return; finish with canvas wait')
    .action(async (options, command) => {
      const global = getGlobalOptions(command);
      const address =
        global.url ?? process.env.GHOST_URL ?? (await resolveConnectionConfig(global)).url;
      const site = new URL(address.endsWith('/') ? address : address + '/');
      validateServiceUrl(site.origin);
      const siteResponse = await fetch(new URL('ghost/api/admin/site/', site), {
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (!siteResponse.ok) {
        throw new GhstError('Cannot discover the Ghost canvas relay.', {
          code: 'RELAY_UNAVAILABLE',
        });
      }
      const discovery = (await siteResponse.json()) as {
        site: { url: string; canvas_relay?: { url: string; tenant: string } };
      };
      const relay = discovery.site.canvas_relay;
      if (!relay || new URL(discovery.site.url).origin !== site.origin) {
        throw new GhstError('Use the canonical Ghost URL with its canvas relay configured.', {
          code: 'RELAY_UNAVAILABLE',
        });
      }
      const pending: SavedConnection = {
        serviceUrl: validateServiceUrl(relay.url),
        tenant: relay.tenant,
        session: randomUUID(),
        token: '',
        pollSecret: randomBytes(32).toString('hex'),
      };
      // Create the private file before the network admission, avoiding accidental
      // replacement of another paired editor's credentials.
      await save(options.connection, pending, true);
      const result = await relayRequest(pending, '/pairing', {
        method: 'POST',
        headers: { Origin: site.origin },
        body: JSON.stringify({ siteUrl: site.href, pollSecret: pending.pollSecret }),
      });
      pending.expiresAt = Number(result.expiresAt);
      await save(options.connection, pending);
      const notice = {
        status: 'pairing',
        code: result.code,
        verificationUrl: result.verificationUrl,
        message:
          'Open verificationUrl to connect automatically after signing in. Close the editor tab to disconnect.',
      };
      if (global.json) {
        printJson(notice);
      } else {
        console.log(`${notice.message}\nCode: ${notice.code}\n${notice.verificationUrl}`);
      }
      if (options.wait) {
        printJson(await waitForPairing(pending, options.connection), global.jq);
      }
    });
  const read = async (file: string) => JSON.parse(await readFile(file, 'utf8')) as SavedConnection;
  const output = (data: unknown, command: Command, text: string) => {
    const global = getGlobalOptions(command);
    if (global.json || global.jq) printJson(data, global.jq);
    else console.log(text);
  };
  const editOptions = (command: Command) =>
    command
      .option('--connection <file>', 'Private connection file', defaultConnection)
      .option('--dry-run', 'Validate without adopting the patch')
      .option('--no-wait', 'Return after acceptance instead of waiting for previews')
      .option(
        '--expected-revision <revision>',
        'Require this revision as well as the last-read guard',
      );
  const apply = async (
    patch: CanvasData,
    options: { connection: string; dryRun?: boolean; wait?: boolean; expectedRevision?: string },
    command: Command,
  ) => {
    const result = await canvasEdit(
      await read(options.connection),
      options.connection,
      { ...patch, dryRun: options.dryRun ?? false, wait: options.wait ?? true },
      options.expectedRevision,
    );
    output(result, command, editSummary(result));
  };
  canvas
    .command('files')
    .description('List all theme files')
    .option('--connection <file>', 'Private connection file', defaultConnection)
    .action(async (options, command) => {
      const [data] = await canvasRead(await read(options.connection), options.connection, [
        { operation: 'files', limit: 100 },
      ]);
      output(
        data,
        command,
        (data!.files as { path: string }[]).map((item) => item.path).join('\n'),
      );
    });
  canvas
    .command('search <query>')
    .description('Search theme source')
    .option('--path <path>', 'Restrict to a theme file')
    .option('--connection <file>', 'Private connection file', defaultConnection)
    .action(async (query, options, command) => {
      const [data] = await canvasRead(await read(options.connection), options.connection, [
        {
          operation: 'search',
          query,
          ...(options.path ? { path: sourcePath.parse(options.path) } : {}),
        },
      ]);
      const matches = data!.matches as {
        path: string;
        line: number;
        column: number;
        text: string;
      }[];
      output(
        data,
        command,
        matches
          .map((match) => `${match.path}:${match.line}:${match.column}: ${match.text}`)
          .join('\n') +
          (data!.truncated ? '\nResults truncated; narrow the query or use --path.' : ''),
      );
    });
  canvas
    .command('settings')
    .description('Read editable theme settings and constraints')
    .option('--connection <file>', 'Private connection file', defaultConnection)
    .action(async (options, command) => {
      const [data] = await canvasRead(await read(options.connection), options.connection, [
        { operation: 'settings', limit: 100 },
      ]);
      output(data, command, settingsSummary(data!.settings as CanvasData[]));
    });
  canvas
    .command('frames')
    .description('List available preview frames')
    .option('--connection <file>', 'Private connection file', defaultConnection)
    .action(async (options, command) => {
      const data = await canvasState(await read(options.connection), options.connection);
      const frames = data.frames as {
        id: string;
        label: string;
        device?: CanvasData;
        expanded?: CanvasData;
      }[];
      output(
        frames,
        command,
        frames
          .map(
            (frame) =>
              `${frame.id}\t${frame.label}\tdevice: ${String(frame.device?.status ?? 'unavailable')}; expanded: ${String(frame.expanded?.status ?? 'unavailable')}`,
          )
          .join('\n'),
      );
    });
  editOptions(canvas.command('write <path>').description('Write a local file to the theme draft'))
    .requiredOption('--file <file>', 'Local source file')
    .action(async (path, options, command) => {
      const target = sourcePath.parse(path);
      await apply(
        {
          files: [
            { operation: 'write', path: target, content: await readFile(options.file, 'utf8') },
          ],
        },
        options,
        command,
      );
    });
  editOptions(
    canvas.command('replace <path>').description('Replace one exact, unique source fragment'),
  )
    .requiredOption('--old <text>', 'Existing source fragment')
    .requiredOption('--new <text>', 'Replacement source fragment')
    .action(async (path, options, command) => {
      await apply(
        {
          files: [
            {
              operation: 'replace',
              path: sourcePath.parse(path),
              oldText: options.old,
              newText: options.new,
            },
          ],
        },
        options,
        command,
      );
    });
  canvas
    .command('wait')
    .option('--connection <file>', 'Private connection file', defaultConnection)
    .action(async (options, command) => {
      printJson(
        await waitForPairing(await read(options.connection), options.connection),
        getGlobalOptions(command).jq,
      );
    });
  for (const action of ['status', 'tools', 'disconnect']) {
    const statusCommand = canvas
      .command(action)
      .option('--connection <file>', 'Private connection file', defaultConnection);
    if (action === 'tools')
      statusCommand.option(
        '--schemas',
        'Include full remote schemas; ordinary discovery is compact',
      );
    statusCommand.action(async (options, command) => {
      const connection = await read(options.connection);
      const result = await relayRequest(
        connection,
        action === 'disconnect' ? '/disconnect' : '/status',
        action === 'disconnect' ? { method: 'POST' } : undefined,
      );
      if (action === 'tools' && !options.schemas) {
        const hasState = (result.tools as { name: string }[] | undefined)?.some(
          (tool) => tool.name === 'ghost_canvas_state',
        );
        const current =
          result.ready && hasState ? await canvasAction(connection, 'state') : undefined;
        const summary = capabilitySummary(result, current);
        output(summary, command, capabilityText(summary));
        return;
      }
      printJson(
        action === 'tools'
          ? result.tools
          : action === 'status'
            ? { ready: result.ready, connected: result.connected, epoch: result.epoch }
            : result,
        getGlobalOptions(command).jq,
      );
    });
  }
  canvas
    .command('result <id>')
    .option('--connection <file>', 'Private connection file', defaultConnection)
    .action(async (id, options, command) => {
      if (!/^[0-9a-f-]{36}$/.test(id)) {
        throw new GhstError('Use an operation UUID.', { exitCode: ExitCode.USAGE_ERROR });
      }
      printJson(
        await relayRequest(await read(options.connection), `/calls/${id}`),
        getGlobalOptions(command).jq,
      );
    });
  for (const action of [
    'state',
    'read',
    'edit',
    'inspect',
    'content',
    'history',
    'reveal',
    'review',
  ]) {
    const actionCommand = canvas
      .command(
        action === 'read'
          ? 'read [paths...]'
          : action === 'reveal' || action === 'inspect'
            ? `${action} [frame]`
            : action === 'history' || action === 'content'
              ? `${action} [operation]`
              : action,
      )
      .option('--connection <file>', 'Private connection file', defaultConnection)
      .option('--input <file>', 'JSON arguments file (default: {})')
      .option('--id <uuid>', 'Operation ID for raw --input calls');
    if (action === 'edit')
      actionCommand
        .option('--write <path=file...>', 'Write local files atomically')
        .option('--set <name=value...>', 'Update settings atomically; true/false/null are typed')
        .option('--dry-run', 'Validate without adopting')
        .option('--no-wait', 'Return after acceptance')
        .option('--expected-revision <revision>', 'Require a known revision');
    if (action === 'inspect')
      actionCommand
        .option('--representation <kind>', 'device or expanded', 'expanded')
        .option('--occurrence <id>', 'Inspect a source occurrence from the frame inspection');
    if (action === 'history') actionCommand.option('--checkpoint <id>', 'Checkpoint to restore');
    if (action === 'content')
      actionCommand
        .option('--kind <kind>', 'post, page, tag or author', 'post')
        .option('--content-id <id>', 'Published content to select')
        .option('--template <path>', 'Template for selected content');
    const execute = async (
      paths: string[],
      options: {
        connection: string;
        input?: string;
        id?: string;
        write?: string[];
        set?: string[];
        dryRun?: boolean;
        wait?: boolean;
        expectedRevision?: string;
        representation?: string;
        occurrence?: string;
        checkpoint?: string;
        kind?: string;
        contentId?: string;
        template?: string;
      },
      command: Command,
    ) => {
      const friendly = paths.length > 0 || options.write?.length || options.set?.length;
      const nativeFlags =
        options.dryRun ||
        options.wait === false ||
        options.expectedRevision ||
        options.occurrence ||
        options.checkpoint ||
        options.contentId ||
        options.template;
      if ((friendly || nativeFlags) && (options.input || options.id))
        throw new GhstError('Use command arguments or --input/--id, not both.', {
          exitCode: ExitCode.USAGE_ERROR,
        });
      if (action === 'edit' && nativeFlags && !friendly)
        throw new GhstError(
          'Use canvas edit --write PATH=FILE or --set NAME=VALUE with editing flags.',
          { exitCode: ExitCode.USAGE_ERROR },
        );
      if (
        action !== 'edit' &&
        (options.write ||
          options.set ||
          options.dryRun ||
          options.wait === false ||
          options.expectedRevision)
      )
        throw new GhstError('Editing flags belong to canvas edit.', {
          exitCode: ExitCode.USAGE_ERROR,
        });
      if (action === 'read' && paths.length) {
        const requests = paths.map((path) => ({
          operation: 'source',
          path: sourcePath.parse(path),
          length: 65536,
        }));
        const data = await canvasRead(await read(options.connection), options.connection, requests);
        output(
          data.length === 1 ? data[0] : { files: data },
          command,
          data
            .map(
              (item) =>
                `${data.length > 1 ? `--- ${String(item.path)} ---\n` : ''}${String(item.content)}`,
            )
            .join('\n'),
        );
        return;
      }
      if (action === 'edit' && friendly) {
        const files = await Promise.all(
          (options.write ?? []).map(async (value) => {
            const [path, local] = assignment(value);
            return {
              operation: 'write',
              path: sourcePath.parse(path),
              content: await readFile(local, 'utf8'),
            };
          }),
        );
        if (new Set(files.map((item) => item.path)).size !== files.length)
          throw new GhstError('Only one write per theme file is allowed.', {
            exitCode: ExitCode.USAGE_ERROR,
          });
        const settings: Record<string, string | boolean | null> = {};
        for (const value of options.set ?? []) {
          const [name, text] = assignment(value);
          if (Object.hasOwn(settings, name))
            throw new GhstError(`Setting ${name} appears twice.`, {
              exitCode: ExitCode.USAGE_ERROR,
            });
          settings[name] =
            text === 'true' ? true : text === 'false' ? false : text === 'null' ? null : text;
        }
        await apply(
          {
            ...(files.length ? { files } : {}),
            ...(Object.keys(settings).length ? { settings } : {}),
          },
          options,
          command,
        );
        return;
      }
      if (
        !options.input &&
        !options.id &&
        ['state', 'inspect', 'reveal', 'history', 'content', 'review'].includes(action)
      ) {
        const connection = await read(options.connection);
        if (action === 'state') {
          const data = await canvasState(connection, options.connection);
          const context = data.context as CanvasData;
          const editor = data.editor as CanvasData;
          output(
            data,
            command,
            `Theme: ${String((editor.theme as CanvasData)?.name ?? 'unknown')}\nSite: ${String(data.siteUrl ?? 'not-reported')}\nRevision: ${String(context.revision)}\nDraft: ${editor.dirty ? 'changed' : 'unchanged'}\nFrames: ${(data.frames as unknown[]).length}\n${capabilityText(capabilitySummary({}, data), false)}`,
          );
          return;
        }
        if (action === 'inspect' && !paths.length)
          throw new GhstError('Use canvas inspect FRAME. List frames with canvas frames.', {
            exitCode: ExitCode.USAGE_ERROR,
          });
        const input: CanvasData = { context: await contextForEdit(connection, options.connection) };
        let mutation = false;
        if (action === 'inspect') {
          if (!['expanded', 'device'].includes(options.representation!))
            throw new GhstError('Use --representation expanded or device.', {
              exitCode: ExitCode.USAGE_ERROR,
            });
          const state = await canvasAction(connection, 'state');
          const frame = (state.frames as CanvasData[]).find((item) => item.id === paths[0]);
          if (!frame)
            throw new GhstError(`Unknown frame ${paths[0]}. Run canvas frames.`, {
              exitCode: ExitCode.NOT_FOUND,
            });
          const representation = frame[options.representation!] as CanvasData;
          delete input.context;
          input.target = {
            workspaceId: (state.context as CanvasData).workspaceId,
            frameHandle: frame.frameHandle,
            representationHandle: representation.representationHandle,
            expectedRevision: representation.revision,
            expectedRenderKey: representation.renderKey,
            ...(options.occurrence
              ? {
                  documentId: representation.documentId,
                  documentInstanceId: representation.documentInstanceId,
                }
              : {}),
          };
          if (options.occurrence) input.occurrence = options.occurrence;
        } else if (action === 'reveal') {
          if (!paths.length)
            throw new GhstError('Use canvas reveal FRAME.', { exitCode: ExitCode.USAGE_ERROR });
          input.frame = paths[0];
        } else if (action === 'history') {
          input.operation = paths[0] ?? 'list';
          if (
            !['list', 'restore'].includes(String(input.operation)) ||
            (input.operation === 'restore' && !options.checkpoint)
          )
            throw new GhstError('Use history list or history restore --checkpoint ID.', {
              exitCode: ExitCode.USAGE_ERROR,
            });
          if (options.checkpoint) input.checkpoint = options.checkpoint;
          mutation = input.operation === 'restore';
        } else if (action === 'content') {
          input.operation = paths[0] ?? 'list';
          input.kind = options.kind;
          if (
            !['list', 'select'].includes(String(input.operation)) ||
            !['post', 'page', 'tag', 'author'].includes(options.kind!) ||
            (input.operation === 'select' && !options.contentId)
          )
            throw new GhstError(
              'Use content list/select --kind post/page/tag/author; select requires --content-id ID.',
              { exitCode: ExitCode.USAGE_ERROR },
            );
          if (options.contentId) input.id = options.contentId;
          if (options.template) input.template = sourcePath.parse(options.template);
          mutation = input.operation === 'select';
        }
        const data = await canvasAction(connection, action, input, mutation);
        printJson(data, getGlobalOptions(command).jq);
        return;
      }
      const connection = await read(options.connection);
      const status = await relayRequest(connection, '/status');
      if (!status.ready || typeof status.epoch !== 'string') {
        throw new GhstError('The paired editor is offline.', { code: 'EDITOR_OFFLINE' });
      }
      const id = options.id ?? randomUUID();
      const input = options.input ? JSON.parse(await readFile(options.input, 'utf8')) : {};
      console.error(JSON.stringify({ operationId: id }));
      const result = await callRelay(connection, {
        id,
        epoch: status.epoch,
        tool: `ghost_canvas_${action}`,
        input,
      });
      printJson(result, getGlobalOptions(command).jq);
      if (result.status !== 'completed' || result.result?.status === 'error') {
        throw new GhstError(
          'The operation did not complete successfully. Inspect its result before submitting another edit.',
          { code: 'OPERATION_INCOMPLETE' },
        );
      }
    };
    if (action === 'read')
      actionCommand.action((paths, options, command) => execute(paths, options, command));
    else if (['inspect', 'reveal', 'history', 'content'].includes(action))
      actionCommand.action((value, options, command) =>
        execute(value ? [value] : [], options, command),
      );
    else actionCommand.action((options, command) => execute([], options, command));
  }
}
