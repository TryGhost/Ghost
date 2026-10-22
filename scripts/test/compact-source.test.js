import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { compactFile, compactSource, heapCost } from '../../ghost/scripts/compact-source.mts';

// Built from a code point so formatters can't turn it into a look-alike.
const EM_DASH = String.fromCodePoint(0x2014);

const MODULE = `/*! keep me */\n// a comment\nmodule.exports = function greet(name) {\n  return '${EM_DASH} ' + name;\n};\n`;

// Run a CommonJS snippet and return its export called with 'x'.
function run(source) {
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports });
  return module.exports('x');
}

async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-compact-source-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [rel, content] of Object.entries(files)) {
    const absolute = path.join(root, rel);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, content);
  }
  return root;
}

const read = (root, rel) => fs.readFile(path.join(root, rel), 'utf8');

describe('compactFile', () => {
  it('minifies to ASCII, keeping names and legal comments, and links a positions-only map', () => {
    const outcome = compactFile(MODULE, '../lib/greet.js', '../maps/greet.js.map');
    assert.equal(outcome.status, 'changed');
    assert.doesNotMatch(outcome.code, /a comment/);
    assert.match(outcome.code, /keep me/);
    assert.match(outcome.code, /function greet\(name\)/);
    assert.match(outcome.code, /\\u2014/);
    assert.match(outcome.code, /\/\/# sourceMappingURL=\.\.\/maps\/greet\.js\.map\n$/);
    assert.equal(heapCost(outcome.code), outcome.code.length);
    assert.equal(outcome.before, heapCost(MODULE));
    assert.equal(run(outcome.code), run(MODULE));

    const map = JSON.parse(outcome.map);
    assert.deepEqual(map.sources, ['../lib/greet.js']);
    assert.equal(map.sourcesContent, undefined);
  });

  it('leaves a file it cannot parse, or cannot shrink, as it was', () => {
    assert.deepEqual(compactFile('const = ;', 'a.js', 'a.js.map'), {
      status: 'unchanged',
      reason: 'unparseable',
    });
    assert.deepEqual(compactFile('a=1;', 'a.js', 'a.js.map'), {
      status: 'unchanged',
      reason: 'not smaller',
    });
  });
});

describe('compactSource', () => {
  it('minifies node_modules and core, writing a map next to each file', async (t) => {
    const pkg = 'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg';
    const root = await fixture(t, {
      [`${pkg}/index.js`]: MODULE,
      [`${pkg}/data.json`]: '{"a": 1}',
      'core/server/a.js': MODULE,
      'content/themes/casper/assets/app.js': MODULE,
    });

    const result = await compactSource(root);

    assert.equal(result.files, 2);
    assert.equal(result.changed, 2);
    assert.ok(result.mapBytes > 0);
    assert.doesNotMatch(await read(root, `${pkg}/index.js`), /a comment/);
    assert.deepEqual(JSON.parse(await read(root, `sourcemaps/${pkg}/index.js.map`)).sources, [
      '../../../../../../node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js',
    ]);
    assert.doesNotMatch(await read(root, 'core/server/a.js'), /a comment/);
    assert.deepEqual(JSON.parse(await read(root, 'sourcemaps/core/server/a.js.map')).sources, [
      '../../../core/server/a.js',
    ]);
    assert.equal(await read(root, 'content/themes/casper/assets/app.js'), MODULE);
  });

  it('leaves the code Ghost serves to browsers alone', async (t) => {
    const browserCode = [
      'core/built/admin/app.js',
      'core/frontend/public/ghost.js',
      'core/frontend/src/cards/js/card.js',
    ];
    const root = await fixture(t, Object.fromEntries(browserCode.map((rel) => [rel, MODULE])));

    const result = await compactSource(root);

    assert.equal(result.files, 0);
    for (const rel of browserCode) {
      assert.equal(await read(root, rel), MODULE, rel);
    }
  });

  it('keeps maps out of the code directories, which some loaders require wholesale', async (t) => {
    // knex-migrator requires every file in a migrations directory.
    const root = await fixture(t, {
      'core/server/data/migrations/init/1-create-tables.js': MODULE,
      'core/server/data/migrations/init/2-create-fixtures.js': MODULE,
    });

    await compactSource(root);

    const dir = 'core/server/data/migrations/init';
    assert.deepEqual((await fs.readdir(path.join(root, dir))).sort(), [
      '1-create-tables.js',
      '2-create-fixtures.js',
    ]);
    for (const file of await fs.readdir(path.join(root, dir))) {
      const loaded = { exports: {} };
      vm.runInNewContext(await read(root, `${dir}/${file}`), { module: loaded });
      assert.equal(loaded.exports('x'), `${EM_DASH} x`);
    }
  });

  it('maps stack frames back to the original lines under --enable-source-maps', async (t) => {
    const comment = '// enough comment text that minifying the file is worth it';
    const lines = [comment, comment, comment, "throw new Error('boom');", ''];
    const root = await fixture(t, { 'node_modules/pkg/fail.js': lines.join('\n') });

    await compactSource(root);

    const file = path.join(root, 'node_modules/pkg/fail.js');
    const plain = spawnSync(process.execPath, [file], { encoding: 'utf8' });
    const mapped = spawnSync(process.execPath, ['--enable-source-maps', file], {
      encoding: 'utf8',
    });
    assert.match(plain.stderr, /fail\.js:1\b/);
    assert.match(mapped.stderr, /fail\.js:4\b/);
  });

  it('skips symlinks and writes nothing on a dry run', async (t) => {
    const root = await fixture(t, { 'node_modules/pkg/a.js': MODULE });
    await fs.symlink(path.join(root, 'node_modules/pkg'), path.join(root, 'node_modules/link'));

    const dry = await compactSource(root, { dryRun: true });
    assert.equal(dry.files, 1);
    assert.equal(dry.changed, 1);
    assert.deepEqual(await fs.readdir(path.join(root, 'node_modules/pkg')), ['a.js']);
    assert.equal(await read(root, 'node_modules/pkg/a.js'), MODULE);
  });

  it('replaces files rather than writing through hard links', async (t) => {
    const root = await fixture(t, { 'store/a.js': MODULE });
    await fs.mkdir(path.join(root, 'node_modules/pkg'), { recursive: true });
    await fs.link(path.join(root, 'store/a.js'), path.join(root, 'node_modules/pkg/a.js'));

    await compactSource(root);

    assert.equal(await read(root, 'store/a.js'), MODULE);
    assert.notEqual(await read(root, 'node_modules/pkg/a.js'), MODULE);
  });

  it('leaves no temporary files behind', async (t) => {
    const root = await fixture(t, {
      'node_modules/pkg/a.js': MODULE,
      'node_modules/pkg/b.js': MODULE,
    });

    await compactSource(root);

    assert.deepEqual((await fs.readdir(path.join(root, 'node_modules/pkg'))).sort(), [
      'a.js',
      'b.js',
    ]);
    assert.deepEqual((await fs.readdir(path.join(root, 'sourcemaps/node_modules/pkg'))).sort(), [
      'a.js.map',
      'b.js.map',
    ]);
  });

  it('does nothing for a tree without node_modules or core', async (t) => {
    const root = await fixture(t, { 'content/a.js': MODULE });

    const result = await compactSource(root);

    assert.equal(result.files, 0);
    assert.equal(await read(root, 'content/a.js'), MODULE);
  });

  it('reports files esbuild cannot parse and leaves them alone', async (t) => {
    const root = await fixture(t, { 'node_modules/pkg/view.js': 'const v = <div />;\n' });

    const result = await compactSource(root);

    assert.deepEqual(result.unparseable, ['node_modules/pkg/view.js']);
    assert.equal(await read(root, 'node_modules/pkg/view.js'), 'const v = <div />;\n');
  });
});
