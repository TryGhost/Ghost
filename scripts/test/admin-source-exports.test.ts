import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '../..');
const admin = resolve(root, 'apps/admin');

for (const configFile of ['vite.config.ts', 'vitest.acceptance.config.ts']) {
  it(`${configFile} resolves workspace source, package-local aliases and SVG components`, async () => {
    const { stdout } = await run(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import { createServer, loadConfigFromFile } from 'vite';
      const root = process.cwd();
      const loaded = await loadConfigFromFile({command:'serve', mode:'test'}, ${JSON.stringify(resolve(admin, configFile))});
      const server = await createServer({
        ...loaded.config,
        configFile: false,
        root,
        mode: 'test',
        server: {middlewareMode:true, watch:null},
        optimizeDeps: {noDiscovery:true, include:[]},
      });
      try {
        const container = server.environments.client.pluginContainer;
        const importer = root + '/src/main.tsx';
        const ids = {};
        for (const id of ['@tryghost/admin-x-framework','@tryghost/admin-x-framework/api/config','@tryghost/admin-x-framework/test/setup','@tryghost/shade/components','@tryghost/shade/utils']) {
          ids[id] = (await container.resolveId(id, importer))?.id;
        }
        const alias = (await container.resolveId('@/lib/utils', root + '/../shade/src/components/ui/button.tsx'))?.id;
        const svg = (await server.transformRequest('/@fs' + root + '/../shade/src/assets/images/ghost-logo.svg?react'))?.code;
        const react = await Promise.all([importer, root + '/../shade/src/components/ui/button.tsx', root + '/../admin-x-framework/src/index.ts'].map(async file => (await container.resolveId('react', file))?.id));
        const queries = await Promise.all([importer, root + '/../admin-x-framework/src/index.ts'].map(async file => (await container.resolveId('@tanstack/react-query', file))?.id));
        console.log(JSON.stringify({ids, alias, svg, react, queries}));
      } finally { await server.close(); }
    `,
      ],
      { cwd: admin, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );
    const result = JSON.parse(stdout.trim().split('\n').at(-1)!) as {
      ids: Record<string, string>;
      alias: string;
      svg: string;
      react: string[];
      queries: string[];
    };
    assert.equal(
      result.ids['@tryghost/admin-x-framework'],
      resolve(root, 'apps/admin-x-framework/src/index.ts'),
    );
    assert.equal(
      result.ids['@tryghost/admin-x-framework/api/config'],
      resolve(root, 'apps/admin-x-framework/src/api/config.ts'),
    );
    assert.equal(
      result.ids['@tryghost/admin-x-framework/test/setup'],
      resolve(root, 'apps/admin-x-framework/src/test/setup.ts'),
    );
    assert.equal(
      result.ids['@tryghost/shade/components'],
      resolve(root, 'apps/shade/src/components.ts'),
    );
    assert.equal(result.ids['@tryghost/shade/utils'], resolve(root, 'apps/shade/src/utils.ts'));
    assert.equal(result.alias, resolve(root, 'apps/shade/src/lib/utils.ts'));
    assert.ok(result.react[0]);
    assert.ok(result.queries[0]);
    assert.equal(new Set(result.react).size, 1);
    assert.equal(new Set(result.queries).size, 1);
    assert.match(result.svg, /export default/);
    assert.match(result.svg, /jsx|createElement/);
    assert.doesNotMatch(result.svg, /export default "\/.*\.svg"/);
  });
}

describe('compiled export compatibility', () => {
  it('keeps normal Node imports on compiled entry points', async () => {
    const { stdout } = await run(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      console.log(JSON.stringify([
        import.meta.resolve('@tryghost/admin-x-framework/api/config'),
        import.meta.resolve('@tryghost/shade/components'),
      ]));
    `,
      ],
      { cwd: admin },
    );
    const [framework, shade] = JSON.parse(stdout) as string[];
    assert.ok(framework);
    assert.ok(shade);
    assert.match(framework, /\/admin-x-framework\/dist\/api\/config\.js$/);
    assert.match(shade, /\/shade\/es\/components\.js$/);
  });

  it('retains compiled CommonJS exports and points every source condition at a source file', () => {
    for (const app of ['admin-x-framework', 'shade']) {
      const pkgPath = resolve(root, 'apps', app, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        exports: Record<string, string | Record<string, string>>;
      };
      for (const value of Object.values(pkg.exports)) {
        if (typeof value === 'string') {
          continue;
        }
        assert.equal(Object.keys(value)[0], 'source');
        assert.ok(value.source);
        if (value.source.includes('*')) {
          assert.ok(value.source.startsWith('./src/'));
        } else {
          assert.ok(readFileSync(resolve(dirname(pkgPath), value.source), 'utf8').length > 0);
        }
        if (app === 'admin-x-framework') {
          assert.ok(value.require);
          assert.match(value.require, /^\.\/dist\/.*\.cjs$/);
        }
      }
    }
  });
});
