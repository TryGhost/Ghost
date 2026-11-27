import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('Retired internal CLI entrypoints', function () {
  let directory: string;
  beforeAll(function () {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-retired-cli-'));
    fs.mkdirSync(path.join(directory, 'core'));
    fs.copyFileSync(
      path.resolve(__dirname, '../../../index.js'),
      path.join(directory, 'index.cjs'),
    );
    fs.writeFileSync(
      path.join(directory, 'core/boot.js'),
      "module.exports = () => process.stdout.write('SERVER_BOOT\\n');",
    );
  });
  afterAll(function () {
    fs.rmSync(directory, { recursive: true, force: true });
  });
  for (const [old, replacement] of [
    ['repl', 'repl'],
    ['timetravel', 'data shift-dates'],
    ['generate-data', 'data generate'],
  ]) {
    it(`${old} reports its gx replacement without booting or needing the retired framework`, function () {
      const result = spawnSync(process.execPath, [path.join(directory, 'index.cjs'), old], {
        encoding: 'utf8',
      });
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, new RegExp(`pnpm gx ${replacement}`));
    });
  }
  it('still boots the server when no legacy command is supplied', function () {
    const result = spawnSync(process.execPath, [path.join(directory, 'index.cjs')], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'SERVER_BOOT\n');
  });
});
