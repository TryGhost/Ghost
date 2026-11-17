import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { defaultExport, describeManifest } from '../../../core/kernel/domains/discover';
import { readDomains } from '../../../core/foundation/domains';

describe('readDomains', function () {
  let root: string;
  const write = (file: string, content = '') => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };

  beforeEach(function () {
    root = mkdtempSync(path.join(tmpdir(), 'ghost-domains-'));
  });
  afterEach(function () {
    rmSync(root, { recursive: true, force: true });
  });

  it('reads a real folder, including one capability subfolder', function () {
    write('gifts/CONTEXT.md');
    write('gifts/boot.ts');
    write('gifts/http/routes.ts');
    write('gifts/jobs/clean.job.ts');
    write('gifts/jobs/clean.job.js');
    write('gifts/jobs/reminders/send.job.ts');
    write('gifts/services/gifts/index.ts');
    write('gifts/transition/jobs/old.job.ts');
    assert.deepEqual(describeManifest(readDomains(root)), [
      'domain      gifts/boot',
      'routes      gifts/http/routes',
      'job         gifts/jobs/clean.job',
      'job         gifts/jobs/reminders/send.job',
      'service     gifts/services/gifts/index',
    ]);
  });

  it('loads real files with require', function () {
    write('gifts/jobs/clean.job.js', 'module.exports = { default: { cleaned: true } };');
    const [job] = readDomains(root).files;
    assert.deepEqual(defaultExport(job!), { cleaned: true });
  });

  it('returns nothing when the folder does not exist', function () {
    const manifest = readDomains(path.join(root, 'missing'));
    assert.deepEqual(manifest.domains, []);
    assert.deepEqual(manifest.files, []);
  });

  it('does not hide a folder it cannot read', function () {
    write('not-a-folder');
    // A file where the domains folder should be is a mistake, not an empty application.
    assert.throws(() => readDomains(path.join(root, 'not-a-folder')), /ENOTDIR/);
  });
});
