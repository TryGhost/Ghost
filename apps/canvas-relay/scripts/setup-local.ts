import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

async function main() {
  const corePath = fileURLToPath(new URL('../../../ghost/core/config.local.json', import.meta.url));
  const local = JSON.parse(await readFile(corePath, 'utf8')) as Record<string, unknown> & {
    url: string;
    canvasRelay?: { secret: string; tenant: string };
  };
  const site = new URL(local.url);
  const service = new URL(
    '__admin-dev__/canvas-relay',
    site.href.endsWith('/') ? site.href : site.href + '/',
  ).href;
  const secret = local.canvasRelay?.secret ?? randomBytes(32).toString('hex');
  const tenant = local.canvasRelay?.tenant ?? 'dev-site';
  local.canvasRelay = {
    tenant,
    secret,
    url: service,
    internalUrl: 'http://host.docker.internal:8787' + new URL(service).pathname,
  } as typeof local.canvasRelay;
  await writeFile(corePath, JSON.stringify(local, null, 2) + '\n', { mode: 0o600 });
  await chmod(corePath, 0o600);
  const registry = { [tenant]: { secret, origins: [site.origin] } };
  await writeFile(
    new URL('../.dev.vars', import.meta.url),
    `SERVICE_ORIGIN=${JSON.stringify(service)}\nTENANT_KEYS='${JSON.stringify(registry)}'\n`,
    { mode: 0o600 },
  );
  const adminPath = new URL('../../admin/.env.local', import.meta.url);
  let admin = '';
  try {
    admin = await readFile(adminPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  admin = admin.replace(/^CANVAS_RELAY_DEV_TARGET=.*\n?/gm, '');
  await writeFile(adminPath, admin + '\nCANVAS_RELAY_DEV_TARGET=http://localhost:8787\n', {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      status: 'configured',
      serviceUrl: service,
      tenant,
      message:
        'Start pnpm dev in canvas-relay. Ghost and Admin reload their local configuration. No deployment is made.',
    }),
  );
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
