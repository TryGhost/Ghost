import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { prune } from '../../ghost/core/scripts/prune.mts';

const packagePath = 'node_modules/.pnpm/example@1.0.0/node_modules/example';
const lineMap = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,e30=';
const blockMap = '/*# sourceMappingURL=data:application/json;base64,e30= */';
const code = 'module.exports = "café";\n';

async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-prune-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [rel, content] of Object.entries(files)) {
    const absolute = path.join(root, rel);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, content);
  }
  return root;
}

describe('image inline source-map pruning', () => {
  it('strips final inline maps, preserves other content and reports actual bytes per package', async (t) => {
    const unchanged = {
      'external.js': `${code}//# sourceMappingURL=file.map\n`,
      'none.js': code,
      'enclosing-line.js': `// ordinary comment ${blockMap}\n`,
      'string.js': `module.exports = "${lineMap}";\n`,
      'template.js': `module.exports = \`\n${lineMap}\n\`;\n`,
      'enclosing-comment.js': `/* ordinary comment\n${blockMap}\n`,
      'non-final.js': `${code}${lineMap}\nmodule.exports = 2;\n`,
      'data.json': JSON.stringify({ map: lineMap }),
    };
    const files = {
      ...Object.fromEntries(
        Object.entries(unchanged).map(([name, value]) => [`${packagePath}/${name}`, value]),
      ),
      [`${packagePath}/inline.js`]: `${code}${lineMap}\n`,
      [`${packagePath}/inline.cjs`]: `${code}${blockMap}\r\n \t`,
      [`${packagePath}/inline.mjs`]: `export default 1;\n${lineMap}`,
      'core/app.js': `${code}${lineMap}\n`,
    };
    const root = await fixture(t, files);
    const dry = await prune(root, { profile: 'image', dryRun: true, measure: true });
    assert.equal(
      await fs.readFile(path.join(root, packagePath, 'inline.js'), 'utf8'),
      files[`${packagePath}/inline.js`],
    );
    const result = await prune(root, { profile: 'image', measure: true });
    assert.deepEqual(result, dry);
    assert.equal(result.removed, 0);
    assert.equal(result.total, Object.keys(files).length);
    const removedBytes = Buffer.byteLength(`${lineMap}\n${blockMap}\r\n \t${lineMap}`);
    assert.deepEqual(result.inlineSourceMaps, {
      'example@1.0.0': { files: 3, bytes: removedBytes },
    });
    assert.equal(result.bytes, removedBytes);
    assert.equal(
      result.kept['example@1.0.0'].bytes,
      Object.entries(files)
        .filter(([name]) => name.startsWith('node_modules/'))
        .reduce((sum, [, value]) => sum + Buffer.byteLength(value), 0) - removedBytes,
    );
    for (const [name, content] of Object.entries(unchanged)) {
      assert.equal(await fs.readFile(path.join(root, packagePath, name), 'utf8'), content);
    }
    assert.equal(await fs.readFile(path.join(root, packagePath, 'inline.js'), 'utf8'), code);
    assert.equal(await fs.readFile(path.join(root, packagePath, 'inline.cjs'), 'utf8'), code);
    assert.equal(
      await fs.readFile(path.join(root, packagePath, 'inline.mjs'), 'utf8'),
      'export default 1;\n',
    );
    assert.equal(await fs.readFile(path.join(root, 'core/app.js'), 'utf8'), files['core/app.js']);
    assert.deepEqual((await prune(root, { profile: 'image' })).inlineSourceMaps, {});
  });

  it('handles same-line maps without mutating hard-linked store files', async (t) => {
    const rel = `${packagePath}/inline.js`;
    const source = `module.exports = 1;${blockMap}`;
    const root = await fixture(t, { [rel]: source });
    const original = path.join(root, 'store.js');
    await fs.link(path.join(root, rel), original);
    await prune(root, { profile: 'image' });
    assert.equal(await fs.readFile(path.join(root, rel), 'utf8'), 'module.exports = 1;');
    assert.equal(await fs.readFile(original, 'utf8'), source);
  });

  it('leaves maps intact for the archive profile', async (t) => {
    const rel = `${packagePath}/inline.js`;
    const source = `${code}${lineMap}\n`;
    const root = await fixture(t, { [rel]: source });
    assert.deepEqual((await prune(root, { profile: 'archive' })).inlineSourceMaps, {});
    assert.equal(await fs.readFile(path.join(root, rel), 'utf8'), source);
  });

  it('includes savings in the CLI image report JSON', async (t) => {
    const root = await fixture(t, { [`${packagePath}/inline.js`]: `${code}${lineMap}\n` });
    const reportPath = path.join(root, 'report.json');
    execFileSync(process.execPath, [
      new URL('../../ghost/core/scripts/prune.mts', import.meta.url).pathname,
      root,
      '--profile=image',
      `--report=${reportPath}`,
    ]);
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    assert.deepEqual(report.inlineSourceMaps['example@1.0.0'], {
      files: 1,
      bytes: Buffer.byteLength(`${lineMap}\n`),
    });
    assert.deepEqual(report.packages['example@1.0.0'], {
      files: 1,
      bytes: Buffer.byteLength(code),
    });
    assert.deepEqual(report.total, report.packages['example@1.0.0']);
  });
});
