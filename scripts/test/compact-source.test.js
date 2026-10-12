import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {
  compactFile,
  compactSource,
  escapeNonLatin1,
  heapCost,
} from '../../ghost/scripts/compact-source.mts';

// Run a snippet and return what it assigned to `out`, as plain JSON so results
// from separate contexts compare equal.
function run(source) {
  const context = { out: undefined };
  vm.runInNewContext(source, context);
  return JSON.parse(JSON.stringify(context.out));
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

describe('escapeNonLatin1', () => {
  it('escapes strings, templates, regular expressions and comments without moving lines', () => {
    const source = [
      '// café — résumé',
      "out = ['—', `…${1}`, /[а-я]+/u.test('привет'), /ẞ/.test('ẞ')];",
    ].join('\n');
    const escaped = escapeNonLatin1(source);
    assert.doesNotMatch(escaped, /[Ā-￿]/);
    assert.equal(escaped.split('\n').length, 2);
    assert.deepEqual(run(escaped), run(source));
  });

  it('escapes characters outside the BMP as surrogate pairs', () => {
    const source =
      "out = ['\u{1F600}'.length, /^.$/u.test('\u{1F600}'), /\u{1F600}/.test('x\u{1F600}')];";
    assert.deepEqual(run(escapeNonLatin1(source)), [2, true, true]);
  });

  it('turns an identity escape into a plain escape', () => {
    const source = "out = ['\\—', /\\ẞ/.test('ẞ'), '\\\\—'];";
    assert.deepEqual(run(escapeNonLatin1(source)), run(source));
  });

  it('drops a leading byte order mark', () => {
    assert.equal(escapeNonLatin1('﻿out = 1;'), 'out = 1;');
  });
});

describe('compactFile', () => {
  it('leaves Latin-1 files alone when escaping', () => {
    assert.deepEqual(compactFile("out = 'café';", 'escape', 'a.js'), { status: 'unchanged' });
  });

  it('halves the heap cost of a file with one character above U+00FF', () => {
    const source = `// —\nout = '${'x'.repeat(100)}';`;
    const outcome = compactFile(source, 'escape', 'a.js');
    assert.equal(outcome.status, 'changed');
    assert.equal(outcome.before, heapCost(source));
    assert.ok(outcome.after < outcome.before / 1.9);
  });

  it('refuses escapes that change the program', () => {
    // A line separator ends a // comment; escaped, the code after it would
    // become part of the comment.
    assert.equal(compactFile('// note out = 1;', 'escape', 'a.js').status, 'skipped');
    // String.raw reads the raw text, which the escape changes.
    assert.equal(compactFile('out = String.raw`—`;', 'escape', 'a.js').status, 'skipped');
    // Unicode whitespace between tokens is not valid as an escape.
    assert.equal(compactFile('out　= 1;', 'escape', 'a.js').status, 'skipped');
  });

  it('minifies to ASCII, keeping names, with an external source map', () => {
    const source =
      "// a comment\nfunction greet(name) {\n  return '— ' + name;\n}\nout = greet('x');\n";
    const outcome = compactFile(source, 'minify', 'greet.js');
    assert.equal(outcome.status, 'changed');
    assert.doesNotMatch(outcome.code, /[Ā-￿]|a comment/);
    assert.match(outcome.code, /function greet\(name\)/);
    assert.equal(JSON.parse(outcome.map).sources[0], 'greet.js');
    assert.deepEqual(run(outcome.code), run(source));
  });

  it('keeps legal comments when minifying', () => {
    const outcome = compactFile('/*! keep me */\n// drop me\nout = 1;\n', 'minify', 'a.js');
    assert.equal(outcome.status, 'changed');
    assert.match(outcome.code, /keep me/);
    assert.doesNotMatch(outcome.code, /drop me/);
  });

  it('does nothing in none mode', () => {
    assert.deepEqual(compactFile('out = 1; // —', 'none', 'a.js'), { status: 'unchanged' });
  });
});

describe('compactSource', () => {
  const module =
    "// a comment\nmodule.exports = function greet(name) {\n  return '— ' + name;\n};\n";

  it('minifies dependencies but only escapes core in hybrid mode', async (t) => {
    const root = await fixture(t, {
      'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js': module,
      'core/server/a.js': module,
    });
    const maps = path.join(root, '..', `${path.basename(root)}-maps`);
    t.after(() => fs.rm(maps, { recursive: true, force: true }));

    const result = await compactSource(root, { mode: 'hybrid', maps });

    const dependency = await read(root, 'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js');
    assert.doesNotMatch(dependency, /a comment/);
    assert.equal(await read(root, 'core/server/a.js'), escapeNonLatin1(module));
    assert.equal(result.changed, 2);
    assert.equal(result.remaining, 0);
    await fs.access(path.join(maps, 'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js.map'));
  });

  it('skips browser assets, symlinks and other files, and writes nothing on a dry run', async (t) => {
    const root = await fixture(t, {
      'node_modules/pkg/a.js': module,
      'core/built/admin/app.js': module,
      'core/frontend/public/ghost.js': module,
      'core/frontend/src/cards/card.js': module,
      'core/server/data.json': '{"dash": "—"}',
      'content/themes/casper/assets/app.js': module,
    });
    await fs.symlink(path.join(root, 'node_modules/pkg'), path.join(root, 'node_modules/link'));

    const dry = await compactSource(root, { mode: 'minify', dryRun: true });
    assert.equal(dry.files, 1);
    assert.equal(dry.changed, 1);
    assert.equal(await read(root, 'node_modules/pkg/a.js'), module);

    await compactSource(root, { mode: 'minify' });
    assert.notEqual(await read(root, 'node_modules/pkg/a.js'), module);
    for (const rel of [
      'core/built/admin/app.js',
      'core/frontend/public/ghost.js',
      'core/frontend/src/cards/card.js',
      'content/themes/casper/assets/app.js',
    ]) {
      assert.equal(await read(root, rel), module, rel);
    }
  });

  it('replaces files rather than writing through hard links', async (t) => {
    const root = await fixture(t, { 'store/a.js': module });
    await fs.mkdir(path.join(root, 'node_modules/pkg'), { recursive: true });
    await fs.link(path.join(root, 'store/a.js'), path.join(root, 'node_modules/pkg/a.js'));

    await compactSource(root, { mode: 'escape' });

    assert.equal(await read(root, 'store/a.js'), module);
    assert.equal(await read(root, 'node_modules/pkg/a.js'), escapeNonLatin1(module));
  });

  it('rejects an unknown mode', async () => {
    await assert.rejects(compactSource('.', { mode: 'squash' }), /Unknown mode "squash"/);
  });
});
