import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { SignJWT } from 'jose';
import { callRelay, relayRequest, validateServiceUrl } from '../src/client.ts';
import { tenantId } from '../src/protocol.ts';
import type { RelayConnection } from '../src/protocol.ts';

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean' },
      issuer: { type: 'string' },
      tenant: { type: 'string' },
      service: { type: 'string', default: 'http://localhost:8787' },
      site: { type: 'string' },
      connection: { type: 'string' },
      input: { type: 'string' },
      tool: { type: 'string' },
      id: { type: 'string' },
    },
  });
  const action = positionals[0];
  if (values.help || !action) {
    console.log(
      'connect --issuer FILE --tenant ID --site URL --connection FILE [--service ORIGIN]\nstatus --connection FILE\ncall --connection FILE --tool NAME --input JSON_FILE [--id UUID]\nresult --connection FILE --id UUID\nrevoke --connection FILE --issuer FILE',
    );
    return;
  }
  if (!values.connection) {
    throw new Error('--connection FILE is required');
  }
  if (action === 'connect') {
    if (!values.issuer || !values.tenant || !values.site) {
      throw new Error('Development connect requires --issuer, --tenant and --site');
    }
    tenantId.parse(values.tenant);
    const serviceUrl = validateServiceUrl(values.service!);
    const registry = JSON.parse(await readFile(values.issuer, 'utf8')) as Record<
      string,
      { secret: string; origins: string[] }
    >;
    const tenant = registry[values.tenant];
    const siteUrl = new URL(values.site);
    if (
      !tenant ||
      !tenant.origins.includes(siteUrl.origin) ||
      !siteUrl.hash.startsWith('#/builder/theme')
    ) {
      throw new Error('Use an allowed tenant origin and the theme editor URL');
    }
    const session = randomUUID();
    const token = (role: 'editor' | 'agent') =>
      new SignJWT({ tenant: values.tenant, session, role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('ghost-canvas-relay')
        .setAudience(serviceUrl)
        .setSubject('development-owner')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(tenant.secret));
    const agentToken = await token('agent');
    const editorToken = await token('editor');
    const invitation = new URLSearchParams({
      canvasRelayTenant: values.tenant,
      canvasRelaySession: session,
      canvasRelayToken: editorToken,
    });
    siteUrl.hash = `#/builder/theme?${invitation}`;
    await writeFile(
      values.connection,
      JSON.stringify(
        {
          serviceUrl,
          tenant: values.tenant,
          session,
          token: agentToken,
          editorToken,
          invitationUrl: siteUrl.href,
        },
        null,
        2,
      ) + '\n',
      { mode: 0o600, flag: 'wx' },
    );
    console.log(
      JSON.stringify({
        status: 'created',
        connectionFile: values.connection,
        message:
          'Open invitationUrl from that private file in the signed-in editor. The prototype does not print credentials.',
      }),
    );
    return;
  }
  const connection = JSON.parse(await readFile(values.connection, 'utf8')) as RelayConnection & {
    editorToken: string;
  };
  if (action === 'status') {
    console.log(JSON.stringify(await relayRequest(connection, '/status')));
    return;
  }
  if (action === 'result' && values.id) {
    console.log(JSON.stringify(await relayRequest(connection, `/calls/${values.id}`)));
    return;
  }
  if (action === 'revoke') {
    if (!values.issuer) {
      throw new Error('Development revoke requires --issuer FILE');
    }
    // Prototype issuer holder can exercise the future editor-owned disconnect.
    const registry = JSON.parse(await readFile(values.issuer!, 'utf8')) as Record<
      string,
      { origins: string[] }
    >;
    console.log(
      JSON.stringify(
        await relayRequest({ ...connection, token: connection.editorToken }, '/revoke', {
          method: 'POST',
          headers: { Origin: registry[connection.tenant]!.origins[0]! },
        }),
      ),
    );
    return;
  }
  if (action !== 'call' || !values.tool || !values.input) {
    throw new Error('Use --help for the supported action arguments');
  }
  const status = await relayRequest(connection, '/status');
  if (!status.ready || typeof status.epoch !== 'string') {
    throw new Error('editor_offline');
  }
  const input = JSON.parse(await readFile(values.input, 'utf8')) as Record<string, unknown>;
  const id = values.id ?? randomUUID();
  // Emit the ID before dispatch so an uncertain transport result is recoverable.
  console.error(JSON.stringify({ operationId: id }));
  const result = await callRelay(connection, { id, epoch: status.epoch, tool: values.tool, input });
  console.log(JSON.stringify(result));
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
