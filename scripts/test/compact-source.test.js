import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
  it('minifies to ASCII, keeping names and legal comments, with a source map', () => {
    const outcome = compactFile(MODULE, 'greet.js');
    assert.equal(outcome.status, 'changed');
    assert.doesNotMatch(outcome.code, /a comment/);
    assert.match(outcome.code, /keep me/);
    assert.match(outcome.code, /function greet\(name\)/);
    assert.match(outcome.code, /\\u2014/);
    assert.equal(heapCost(outcome.code), outcome.code.length);
    assert.equal(outcome.before, heapCost(MODULE));
    assert.equal(JSON.parse(outcome.map).sources[0], 'greet.js');
    assert.equal(run(outcome.code), run(MODULE));
  });

  it('leaves a file it cannot parse, or cannot shrink, as it was', () => {
    assert.deepEqual(compactFile('const = ;', 'a.js'), {
      status: 'unchanged',
      reason: 'unparseable',
    });
    assert.deepEqual(compactFile('a=1;', 'a.js'), { status: 'unchanged', reason: 'not smaller' });
  });
});

describe('compactSource', () => {
  it('minifies node_modules only, writing a map per file', async (t) => {
    const root = await fixture(t, {
      'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js': MODULE,
      'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/data.json': '{"a": 1}',
      'core/server/a.js': MODULE,
    });
    const maps = `${root}-maps`;
    t.after(() => fs.rm(maps, { recursive: true, force: true }));

    const result = await compactSource(root, { maps });

    assert.equal(result.files, 1);
    assert.equal(result.changed, 1);
    assert.doesNotMatch(
      await read(root, 'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js'),
      /a comment/,
    );
    assert.equal(await read(root, 'core/server/a.js'), MODULE);
    await fs.access(path.join(maps, 'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js.map'));
  });

  it('skips symlinks and writes nothing on a dry run', async (t) => {
    const root = await fixture(t, { 'node_modules/pkg/a.js': MODULE });
    await fs.symlink(path.join(root, 'node_modules/pkg'), path.join(root, 'node_modules/link'));

    const dry = await compactSource(root, { dryRun: true });
    assert.equal(dry.files, 1);
    assert.equal(dry.changed, 1);
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
  });

  it('does nothing for a tree without node_modules', async (t) => {
    const root = await fixture(t, { 'core/server/a.js': MODULE });

    const result = await compactSource(root);

    assert.equal(result.files, 0);
    assert.equal(await read(root, 'core/server/a.js'), MODULE);
  });

  it('reports files esbuild cannot parse and leaves them alone', async (t) => {
    const root = await fixture(t, { 'node_modules/pkg/view.js': 'const v = <div />;\n' });

    const result = await compactSource(root);

    assert.deepEqual(result.unparseable, ['node_modules/pkg/view.js']);
    assert.equal(await read(root, 'node_modules/pkg/view.js'), 'const v = <div />;\n');
  });
});
