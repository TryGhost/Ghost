import { createHmac } from 'node:crypto';
import errors from '@tryghost/errors';
import config from '../../../../shared/config';

type RelayConfig = { url: string; internalUrl: string; tenant: string; secret: string };

export function relayConfig(): RelayConfig | null {
  const value = config.get('canvasRelay') as RelayConfig | undefined;
  if (!value) {
    return null;
  }
  if (
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value.tenant) ||
    typeof value.secret !== 'string' ||
    value.secret.length < 32
  ) {
    throw new errors.IncorrectUsageError({ message: 'Invalid canvas relay configuration' });
  }
  for (const address of [value.url, value.internalUrl]) {
    const url = new URL(address);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !['https:', 'http:'].includes(url.protocol)
    ) {
      throw new errors.IncorrectUsageError({ message: 'Invalid canvas relay URL' });
    }
  }
  return value;
}

export function editorConnection(session: string, subject: string) {
  const relay = relayConfig();
  if (!relay) {
    throw new errors.NotFoundError({ message: 'Canvas relay is unavailable' });
  }
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    tenant: relay.tenant,
    session,
    sub: subject,
    role: 'editor',
    iat: now,
    exp: now + 3600,
    iss: 'ghost-canvas-relay',
    aud: relay.url,
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', relay.secret)
    .update(header + '.' + payload)
    .digest('base64url');
  return {
    serviceUrl: relay.url,
    tenant: relay.tenant,
    session,
    token: header + '.' + payload + '.' + signature,
  };
}

export async function relayEditorRequest(
  connection: ReturnType<typeof editorConnection>,
  route: string,
  data?: unknown,
) {
  const relay = relayConfig()!;
  const target =
    relay.internalUrl.replace(/\/$/, '') +
    `/v1/tenants/${relay.tenant}/sessions/${connection.session}` +
    route;
  const response = await fetch(target, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${connection.token}`,
      Origin: new URL(config.get('url')).origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data ?? {}),
  });
  const result = (await response.json()) as { code?: string; status?: string };
  if (!response.ok) {
    throw new errors.ValidationError({ message: result.code ?? 'relay_unavailable' });
  }
  return result;
}
