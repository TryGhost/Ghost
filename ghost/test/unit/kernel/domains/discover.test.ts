import assert from 'node:assert/strict';
import path from 'node:path';
import {
  defaultExport,
  describeManifest,
  discoverDomains,
  type FolderEntry,
} from '@tryghost/kernel/domains/discover';

// The kernel reads nothing: these tests describe folders in memory. Reading a
// real folder is the foundry's, tested in ../../foundry/domains.test.ts.
describe('discoverDomains', function () {
  const root = path.join(path.sep, 'app', 'domains');
  let written: string[];
  const write = (file: string) => {
    written.push(file);
  };
  // What a folder holds, worked out from the files written beneath it.
  const list = (directory: string): FolderEntry[] | undefined => {
    const inside = path.relative(root, directory);
    const prefix = inside === '' ? '' : `${inside.split(path.sep).join('/')}/`;
    const entries = new Map<string, FolderEntry>();
    for (const file of written.filter((name) => name.startsWith(prefix))) {
      const [name, ...rest] = file.slice(prefix.length).split('/');
      entries.set(name!, { name: name!, kind: rest.length ? 'folder' : 'file' });
    }
    return entries.size ? [...entries.values()] : undefined;
  };
  const discover = (load: (module: string) => unknown = () => ({})) =>
    discoverDomains(root, { list, load });

  beforeEach(function () {
    written = [];
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
    const manifest = discover();
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
    assert.deepEqual(discover().files, []);
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
    assert.deepEqual(discover().files, []);
  });

  it('finds a module once when a build has left JavaScript beside the TypeScript', function () {
    write('gifts/jobs/clean.job.ts');
    write('gifts/jobs/clean.job.js');
    write('gifts/services/gifts/index.ts');
    write('gifts/services/gifts/index.js');
    const loaded: string[] = [];
    const manifest = discover((module) => {
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
    assert.deepEqual(describeManifest(discover()), ['job         gifts/jobs/clean.job']);
  });

  it('loads nothing until asked, and each file only once', function () {
    write('gifts/jobs/clean.job.ts');
    write('gifts/listeners/thanks.listener.ts');
    let loads = 0;
    const manifest = discover((module) => {
      loads += 1;
      return { default: module };
    });
    assert.equal(loads, 0);
    const [job] = manifest.files;
    assert.equal(defaultExport(job!), job!.module);
    assert.equal(defaultExport(job!), job!.module);
    assert.equal(loads, 1);
  });

  it('finds files in a capability subfolder of a layer folder, one level deep', function () {
    for (const file of [
      'gifts/jobs/clean-expired-gifts.job.ts',
      'gifts/jobs/reminders/send-reminders.job.ts',
      'gifts/listeners/reminders/note-reminder-sent.listener.ts',
      'gifts/actions/reminders/schedule-reminder.action.ts',
      'gifts/events/reminders/reminder-sent.event.ts',
    ]) {
      write(file);
    }
    const manifest = discover();
    assert.deepEqual(describeManifest(manifest), [
      'action      gifts/actions/reminders/schedule-reminder.action',
      'event       gifts/events/reminders/reminder-sent.event',
      'job         gifts/jobs/clean-expired-gifts.job',
      'job         gifts/jobs/reminders/send-reminders.job',
      'listener    gifts/listeners/reminders/note-reminder-sent.listener',
    ]);
    // The capability is part of the name, so two capabilities may each have a `send`.
    const job = manifest.files.find((file) => file.id.includes('reminders/send-reminders'))!;
    assert.equal(job.name, 'reminders/send-reminders');
    assert.equal(job.module, path.join(root, 'gifts/jobs/reminders/send-reminders.job'));
  });

  it('does not look deeper than one capability subfolder', function () {
    write('gifts/jobs/reminders/weekly/send-digest.job.ts');
    write('gifts/services/gifts/nested/index.ts');
    assert.deepEqual(discover().files, []);
  });

  it('ignores a wrongly named file in a capability subfolder', function () {
    write('gifts/jobs/reminders/helper.ts');
    write('gifts/jobs/reminders/send.listener.ts');
    assert.deepEqual(discover().files, []);
  });

  it('returns nothing when the folder does not exist', function () {
    const manifest = discoverDomains(path.join(root, 'missing'), { list, load: () => ({}) });
    assert.deepEqual(manifest.domains, []);
    assert.deepEqual(manifest.files, []);
  });
});
