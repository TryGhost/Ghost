import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  defaultExport,
  describeManifest,
  discoverDomains,
} from '../../../../core/kernel/domains/discover';

describe('discoverDomains', function () {
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

  it('finds each kind of file by its fixed folder and role, in a stable order', function () {
    for (const file of [
      'gifts/CONTEXT.md',
      'gifts/boot.ts',
      'gifts/settings.ts',
      'gifts/permissions.ts',
      'gifts/schema.ts',
      'gifts/http/routes.ts',
      'gifts/http/gift.controller.ts',
      'gifts/actions/redeem-gift.action.ts',
      'gifts/events/gift-redeemed.event.ts',
      'gifts/listeners/send-thanks.listener.ts',
      'gifts/jobs/clean-expired-gifts.job.ts',
      'gifts/services/gifts/index.ts',
      'gifts/services/gifts/gift.service.ts',
      'gifts/repositories/gift.repository.ts',
      'gifts/entities/gift.entity.ts',
      'gifts/data/gift.data.ts',
      'alerts/actions/raise-alert.action.ts',
    ]) {
      write(file);
    }
    const manifest = discoverDomains(root, () => ({}));
    assert.deepEqual(manifest.domains, ['alerts', 'gifts']);
    assert.deepEqual(describeManifest(manifest), [
      'action      alerts/actions/raise-alert.action',
      'action      gifts/actions/redeem-gift.action',
      'domain      gifts/boot',
      'event       gifts/events/gift-redeemed.event',
      'routes      gifts/http/routes',
      'job         gifts/jobs/clean-expired-gifts.job',
      'listener    gifts/listeners/send-thanks.listener',
      'permissions gifts/permissions',
      'schema      gifts/schema',
      'service     gifts/services/gifts/index',
      'settings    gifts/settings',
    ]);
    const job = manifest.files.find((file) => file.kind === 'job')!;
    assert.equal(job.name, 'clean-expired-gifts');
    assert.equal(job.domain, 'gifts');
    assert.equal(job.module, path.join(root, 'gifts/jobs/clean-expired-gifts.job'));
  });

  it('never finds anything in transition/ or test/', function () {
    for (const file of [
      'gifts/transition/services/gifts/index.ts',
      'gifts/transition/listeners/old.listener.ts',
      'gifts/transition/jobs/old.job.ts',
      'gifts/transition/events/do-thing.event.ts',
      'gifts/test/unit/jobs/clean.job.test.ts',
      'gifts/test/jobs/sneaky.job.ts',
    ]) {
      write(file);
    }
    assert.deepEqual(discoverDomains(root, () => ({})).files, []);
  });

  it('ignores files without the role for their folder, declarations and tests', function () {
    for (const file of [
      'gifts/jobs/helper.ts',
      'gifts/jobs/clean.job.d.ts',
      'gifts/jobs/clean.job.test.ts',
      'gifts/jobs/README.md',
      'gifts/listeners/clean.job.ts',
      'gifts/services/README.md',
      'gifts/services/no-root/gift.service.ts',
    ]) {
      write(file);
    }
    assert.deepEqual(discoverDomains(root, () => ({})).files, []);
  });

  it('finds a module once when a build has left JavaScript beside the TypeScript', function () {
    write('gifts/jobs/clean.job.ts');
    write('gifts/jobs/clean.job.js');
    write('gifts/services/gifts/index.ts');
    write('gifts/services/gifts/index.js');
    const loaded: string[] = [];
    const manifest = discoverDomains(root, (module) => {
      loaded.push(module);
      return {};
    });
    assert.deepEqual(describeManifest(manifest), [
      'job         gifts/jobs/clean.job',
      'service     gifts/services/gifts/index',
    ]);
    // The module is named without an extension: the running loader chooses.
    manifest.files[0]!.load();
    assert.deepEqual(loaded, [path.join(root, 'gifts/jobs/clean.job')]);
  });

  it('finds built JavaScript when the TypeScript source is not shipped', function () {
    write('gifts/jobs/clean.job.js');
    assert.deepEqual(describeManifest(discoverDomains(root, () => ({}))), [
      'job         gifts/jobs/clean.job',
    ]);
  });

  it('loads nothing until asked, and each file only once', function () {
    write('gifts/jobs/clean.job.ts');
    write('gifts/listeners/thanks.listener.ts');
    let loads = 0;
    const manifest = discoverDomains(root, (module) => {
      loads += 1;
      return { default: module };
    });
    assert.equal(loads, 0);
    const [job] = manifest.files;
    assert.equal(defaultExport(job!), job!.module);
    assert.equal(defaultExport(job!), job!.module);
    assert.equal(loads, 1);
  });

  it('loads real files with require by default', function () {
    write('gifts/jobs/clean.job.js', 'module.exports = { default: { cleaned: true } };');
    const [job] = discoverDomains(root).files;
    assert.deepEqual(defaultExport(job!), { cleaned: true });
  });

  it('returns nothing when the folder does not exist', function () {
    const manifest = discoverDomains(path.join(root, 'missing'));
    assert.deepEqual(manifest.domains, []);
    assert.deepEqual(manifest.files, []);
  });
});
