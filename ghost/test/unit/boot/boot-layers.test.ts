import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Boot has three layers, started in this order and each one whole before the
// next: foundation, shared, domains. This file pins which step of boot.js
// starts what, read from the source, so a start that drifts into the wrong
// layer fails here and names the rule.
const boot = readFileSync(path.resolve(__dirname, '../../../core/boot.js'), 'utf8');
const declarations = [...boot.matchAll(/^(?:async )?function (\w+)\(/gm)];

function step(name: string): string {
  const index = declarations.findIndex((declaration) => declaration[1] === name);
  assert.notEqual(index, -1, `boot.js has no step called ${name}`);
  return boot.slice(declarations[index]!.index, declarations[index + 1]?.index);
}

const required = (source: string) =>
  [...source.matchAll(/require\('([^']+)'\)/g)].map((match) => match[1]!);

// What starts in each layer's step, as the path boot.js requires it by.
const SHARED = [
  './shared/url-utils',
  './server/services/limits',
  './server/services/settings/settings-service',
  './server/services/signing-keys',
  './server/services/internal-keys',
  './shared/i18n',
  // Handed to i18n, not started.
  './server/lib/common/events',
  // Mail has no start; this is the one thing a mailer needs built first.
  './server/services/email-address',
  './server/services/permissions',
];

describe('Boot layers', function () {
  it('starts the layers in order, with nothing between them', function () {
    const entry = step('bootGhost');
    const awaited = [...entry.matchAll(/^\s+(?:const \w+ = )?await (init\w+)\(/gm)].map(
      (match) => match[1],
    );

    assert.deepEqual(
      awaited.slice(0, 5),
      ['initDatabase', 'initFoundationChecks', 'initShared', 'initDomains', 'initLegacyCore'],
      'After the database is ready, boot starts the shared layer, then the domain layer, then everything else. ' +
        'A step that has to run between two layers is an exception: say why in the findings before adding it.',
    );
    // The foundation is built before any of them.
    assert.ok(
      entry.indexOf('application.startFoundation()') < entry.indexOf('await initDatabase('),
    );
  });

  it('starts exactly the shared modules in the shared layer', function () {
    assert.deepEqual(
      required(step('initShared')).sort(),
      [...SHARED].sort(),
      'initShared starts the modules every domain may rely on: url-utils, limits, settings, ' +
        'signing keys, internal keys, i18n, the email address policy and permissions. A service that belongs to one ' +
        'feature starts in its domain, or in initLegacyCore or initServices until it has one.',
    );
  });

  it('starts no shared module anywhere else', function () {
    const starts = [
      'limits.init(',
      'settings.init(',
      'settings.syncEmailSettings(',
      'signingKeys.init(',
      'internalKeys.init(',
      'i18n.init(',
      'emailAddressService.init(',
      'permissions.init(',
    ];
    const shared = step('initShared');
    for (const start of starts) {
      assert.equal(boot.split(start).length - 1, 1, `${start} is called once in boot.js`);
      assert.ok(shared.includes(start), `${start} is called in initShared`);
    }
  });

  it('starts the domain layer in its own step, which requires nothing else', function () {
    assert.deepEqual(required(step('initDomains')), ['../bootstrap/domains']);
    assert.equal(boot.split('domains.start(').length - 1, 1, 'domains.start() is called once');
    assert.ok(step('initDomains').includes('await domains.start()'));
  });

  it('checks config before the shared layer with nothing but config', function () {
    assert.deepEqual(required(step('initFoundationChecks')).sort(), [
      './server/lib/image/image-content',
      './server/lib/image/image-decoders',
      './server/services/adapter-manager',
      '@tryghost/logging',
    ]);
  });
});
