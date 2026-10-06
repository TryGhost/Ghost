import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';

async function main() {
  const { values } = parseArgs({
    options: {
      config: { type: 'string', default: '/tmp/ghost-canvas-relay-issuer.json' },
      port: { type: 'string', default: '8787' },
    },
  });
  const port = Number(values.port);
  let tenants: Record<string, { secret: string; origins: string[] }>;
  try {
    tenants = JSON.parse(await readFile(values.config!, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    tenants = Object.fromEntries(
      ['dev-site', 'other-site'].map((tenant) => [
        tenant,
        {
          secret: randomBytes(32).toString('hex'),
          origins: ['http://localhost:2368', 'http://localhost:5174'],
        },
      ]),
    );
    await writeFile(values.config!, JSON.stringify(tenants, null, 2) + '\n', {
      mode: 0o600,
      flag: 'wx',
    });
  }
  const mf = new Miniflare({
    modules: true,
    scriptPath: fileURLToPath(new URL('../build/worker.js', import.meta.url)),
    modulesRules: [{ type: 'ESModule', include: ['**/*.js'], fallthrough: true }],
    compatibilityDate: '2026-04-01',
    port,
    durableObjects: { SESSIONS: { className: 'CanvasSession', useSQLite: true } },
    durableObjectsPersist: fileURLToPath(new URL('../.wrangler/local', import.meta.url)),
    bindings: { TENANT_KEYS: JSON.stringify(tenants), SERVICE_ORIGIN: `http://localhost:${port}` },
    cf: false,
  });
  console.log(`Canvas relay: ${await mf.ready}. Development issuer file: ${values.config}`);
  const stop = () => {
    void mf.dispose().then(() => process.exit(0));
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
