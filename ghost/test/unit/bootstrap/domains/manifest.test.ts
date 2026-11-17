import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { definitionKind } from '../../../../core/kernel/domains/definitions';
import { defaultExport, describeManifest } from '../../../../core/kernel/domains/discover';
import { domainsRoot, getDomainManifest } from '../../../../core/bootstrap/domains/manifest';

// Creating a file in a domain has its effect: a job is scheduled, a listener is
// subscribed, routes are mounted. This test makes that visible in review. It
// fails whenever the set of found files changes, so a change is deliberate.
describe('ghost/domains manifest', function () {
  const manifest = getDomainManifest();

  it('finds exactly the files listed in domains/manifest.txt', function () {
    const expected = readFileSync(path.join(domainsRoot, 'manifest.txt'), 'utf8');
    assert.equal(
      describeManifest(manifest)
        .map((line) => `${line}\n`)
        .join(''),
      expected,
      'The files found in ghost/domains changed. If that is intended, run `pnpm --filter ghost domains:list --write` and commit domains/manifest.txt.',
    );
  });

  // Loading a described file must be safe before Ghost has started: these only describe.
  const describing = {
    domain: 'domain',
    job: 'job',
    listener: 'listener',
    permissions: 'permissions',
    routes: 'routes',
    schema: 'schema',
    settings: 'settings',
  } as const;
  for (const file of manifest.files) {
    const expected = describing[file.kind as keyof typeof describing];
    if (expected) {
      it(`${file.id} default-exports a ${expected} definition`, function () {
        assert.equal(definitionKind(defaultExport(file)), expected);
      });
    }
  }

  it('gives every event a name no other event has', function () {
    const names = new Map<string, string>();
    for (const file of manifest.files.filter(({ kind }) => kind === 'event')) {
      const event = defaultExport(file) as { name?: string };
      assert.equal(definitionKind(event), 'event', `${file.id} must default-export an event`);
      assert.equal(names.get(event.name!), undefined, `${file.id} reuses the name ${event.name}`);
      names.set(event.name!, file.id);
    }
  });
});
