import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { findPackageJSON } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { ICruiseResult } from 'dependency-cruiser';
import { legacyInventoryFile } from '../../configs/oxlint/legacy-services.ts';
import { copyRelocated } from '../lib/relocate.ts';

const repository = path.resolve(import.meta.dirname, '../../..');
const depcruiseManifest =
  findPackageJSON('dependency-cruiser', import.meta.url) ??
  assert.fail('dependency-cruiser is not installed');
const cli = path.join(
  path.dirname(depcruiseManifest),
  (JSON.parse(readFileSync(depcruiseManifest, 'utf8')) as { bin: { depcruise: string } }).bin
    .depcruise,
);

// The fixture domains laid out where real domains live, with the real rules.
// Each test adds one file and checks which rule, if any, objects.
describe('domain import rules', () => {
  let root: string;
  const write = (file: string, source: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), source);
  };

  before(() => {
    root = mkdtempSync(path.join(tmpdir(), 'ghost-domain-boundaries-'));
    copyRelocated(repository, root, [
      { from: 'ghost/test/utils/fixtures/domains', to: 'ghost/domains' },
      {
        // What the fixtures' application shares beyond the foundation: its
        // domain files import it, as Ghost's import settings or mail.
        from: 'ghost/test/utils/fixtures/second-application/shared.ts',
        to: 'ghost/core/shared/second-application/shared.ts',
      },
    ]);
    cpSync(path.join(repository, 'ghost/core/kernel'), path.join(root, 'ghost/core/kernel'), {
      recursive: true,
    });
    for (const [file, source] of Object.entries({
      'package.json': '{"private":true,"type":"commonjs"}',
      [legacyInventoryFile]: JSON.stringify({ services: {} }),
      '.dependency-cruiser-known-violations.json': '[]',
      'tools/scripts/package.json': '{"type":"module"}',
      'tools/configs/oxlint/package.json': '{"type":"module"}',
      'apps/empty.ts': 'export {};',
      // Legacy code and another domain's internals for the violations to reach.
      'ghost/core/server/services/staff/index.ts': 'export default {};',
      'ghost/core/server/models/index.js': 'module.exports = {};',
      'ghost/core/shared/config/index.js': 'module.exports = {};',
      'ghost/core/shared/sentry.js': 'module.exports = {};',
      'ghost/core/server/data/db/index.js': 'module.exports = {};',
      'ghost/core/foundry/logging.ts': 'export const createLogger = () => ({});',
      'ghost/core/bootstrap/app.ts': 'export default {};',
      'ghost/core/server/web/api/middleware.js': 'module.exports = {};',
      'ghost/core/server/api/endpoints/index.js': 'module.exports = {};',
      'ghost/domains/library/transition/services/old-catalogue/legacy.js': 'module.exports = {};',
    })) {
      write(file, source);
    }
    for (const file of [
      '.dependency-cruiser.cjs',
      'tools/scripts/lib/dependency-boundaries.ts',
      'tools/configs/oxlint/legacy-services.ts',
      'tools/configs/oxlint/service-locations.cjs',
      'tools/scripts/ci/check-boundaries.ts',
    ]) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      cpSync(path.join(repository, file), path.join(root, file));
    }
    for (const file of [
      'tools/scripts/ci/service-dependency-resolver.mjs',
      'tools/scripts/node_modules',
      'tools/configs/oxlint/node_modules',
    ]) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      symlinkSync(path.join(repository, file), path.join(root, file));
    }
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  // Every finding of the domain rules, as `rule: from → to`.
  function findings() {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        'ghost/core',
        'ghost/domains',
        '--config',
        '.dependency-cruiser.cjs',
        '--output-type',
        'json',
      ],
      { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    assert.ifError(result.error);
    const graph = JSON.parse(result.stdout) as ICruiseResult;
    return graph.summary.violations
      .filter(({ rule }) => /^(?:domain|foundry|kernel)-/.test(rule.name))
      .map(({ rule, from, to }) => ({
        rule: rule.name,
        severity: rule.severity,
        edge: `${from.replace(/^ghost\//, '')} → ${to.replace(/^ghost\//, '')}`,
      }));
  }
  const errors = () => findings().filter(({ severity }) => severity === 'error');

  // Adds one file, reads the errors it causes, and removes it again.
  function violationsOf(file: string, source: string) {
    write(file, source);
    try {
      return errors()
        .map(({ rule, edge }) => `${rule}: ${edge}`)
        .sort();
    } finally {
      rmSync(path.join(root, file));
    }
  }

  it('accepts the fixture domains as they are', () => {
    assert.deepEqual(errors(), []);
  });

  it('passes the boundary lint command', () => {
    const lint = spawnSync(process.execPath, ['tools/scripts/ci/check-boundaries.ts'], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(lint.status, 0, lint.stdout + lint.stderr);
    assert.match(lint.stdout, /No new dependency violations/);
  });

  describe('cross-domain imports', () => {
    it("rejects another domain's service, repository or controller", () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/notices/services/notices/reach.service.ts',
          [
            "import catalogue from '../../../library/services/catalogue';",
            "import { BookRepository } from '../../../library/repositories/book.repository';",
            "import { browse } from '../../../library/http/book.controller';",
            'export const used = [catalogue, BookRepository, browse];',
          ].join('\n'),
        ),
        [
          'domain-public-surface: domains/notices/services/notices/reach.service.ts → domains/library/http/book.controller.ts',
          'domain-public-surface: domains/notices/services/notices/reach.service.ts → domains/library/repositories/book.repository.ts',
          'domain-public-surface: domains/notices/services/notices/reach.service.ts → domains/library/services/catalogue/index.ts',
        ],
      );
    });

    // The scan compiles TypeScript first, which removes type-only imports. A
    // type taken from another domain's internals is therefore not seen here.
    it("does not see a type-only import of another domain's internals", () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/notices/services/notices/reach.service.ts',
          "import type { Book } from '../../../library/entities/book.entity';\nexport type Used = Book;",
        ),
        [],
      );
    });

    it("accepts another domain's data and events anywhere, and its actions in the domain file", () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/notices/listeners/second.listener.ts',
          [
            "import type { BookSummary } from '../../library/data/book.data';",
            "import BookLent from '../../library/events/book-lent.event';",
            'export default { event: BookLent, handle: (book: BookSummary) => book };',
          ].join('\n'),
        ),
        [],
      );
    });

    it("rejects another domain's action in an implementation file: the domain file hands it over", () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/notices/services/notices/reach.service.ts',
          "import { describeBook } from '../../../library/actions/describe-book.action';\nexport const used = describeBook;",
        ),
        [
          'domain-implementation-imports: domains/notices/services/notices/reach.service.ts → domains/library/actions/describe-book.action.ts',
        ],
      );
    });

    it("rejects another domain's transition folder outside the domain file", () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/notices/services/notices/reach.service.ts',
          "const legacy = require('../../../library/transition/services/old-catalogue/legacy');\nexport const used = legacy;",
        ),
        [
          'domain-transition-private: domains/notices/services/notices/reach.service.ts → domains/library/transition/services/old-catalogue/legacy.js',
        ],
      );
    });

    it('rejects legacy code reaching into a domain past its public folders and transition', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/core/server/services/staff/reach.ts',
          [
            "import catalogue from '../../../../domains/library/services/catalogue';",
            "import { describeBook } from '../../../../domains/library/actions/describe-book.action';",
            "const legacy = require('../../../../domains/library/transition/services/old-catalogue/legacy');",
            'export const used = [catalogue, describeBook, legacy];',
          ].join('\n'),
        ).filter((violation) => violation.startsWith('domain-')),
        [
          'domain-public-surface: core/server/services/staff/reach.ts → domains/library/services/catalogue/index.ts',
        ],
      );
    });
  });

  describe('implementation files', () => {
    it('rejects legacy code, foundation instances and unlisted libraries; accepts types', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/library/repositories/reach.repository.ts',
          [
            "import errors from '@tryghost/errors';",
            "import type { GhostLogger } from '@tryghost/logging';",
            "import { getUnixTime } from '../../../core/kernel/clock';",
            "import logging from '@tryghost/logging';",
            "import knex from 'knex';",
            "const models = require('../../../core/server/models');",
            "const config = require('../../../core/shared/config');",
            'export const used = [errors, getUnixTime, logging, knex, models, config] as unknown as GhostLogger[];',
          ].join('\n'),
        ),
        [
          // A foundation instance is reported twice: it is not on the list of
          // libraries, and it is something reshaped code is handed.
          'domain-foundation-injected: domains/library/repositories/reach.repository.ts → @tryghost/logging',
          'domain-foundation-injected: domains/library/repositories/reach.repository.ts → core/shared/config/index.js',
          'domain-implementation-imports: domains/library/repositories/reach.repository.ts → @tryghost/logging',
          'domain-implementation-imports: domains/library/repositories/reach.repository.ts → core/server/models/index.js',
          'domain-implementation-imports: domains/library/repositories/reach.repository.ts → core/shared/config/index.js',
          'domain-implementation-imports: domains/library/repositories/reach.repository.ts → knex',
        ],
      );
    });

    it('lets files across the domain read a service root, but not the service itself', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/library/services/catalogue/reach.service.ts',
          "import catalogue from './index';\nimport lending from '../lending';\nexport const used = [catalogue, lending];",
        ),
        [
          'domain-own-root: domains/library/services/catalogue/reach.service.ts → domains/library/services/catalogue/index.ts',
        ],
      );
    });
  });

  describe('the domain file', () => {
    it('counts legacy and transition imports without failing', () => {
      write(
        'ghost/domains/alerts/boot.ts',
        [
          "const staff = require('../../core/server/services/staff');",
          "const sentry = require('../../core/shared/sentry');",
          "const legacy = require('../library/transition/services/old-catalogue/legacy');",
          'export default { staff, sentry, legacy };',
        ].join('\n'),
      );
      try {
        assert.deepEqual(errors(), []);
        assert.deepEqual(
          findings()
            // The fixtures' own domain files import what their application shares,
            // which is counted too. This looks at the file added here.
            .filter(({ severity, edge }) => severity === 'info' && edge.includes('alerts/boot.ts'))
            .map(({ rule, edge }) => `${rule}: ${edge}`)
            .sort(),
          [
            // Sentry is shared, so it is not counted.
            'domain-legacy-imports: domains/alerts/boot.ts → core/server/services/staff/index.ts',
            'domain-transition-imports: domains/alerts/boot.ts → domains/library/transition/services/old-catalogue/legacy.js',
          ],
        );
      } finally {
        rmSync(path.join(root, 'ghost/domains/alerts'), { recursive: true });
      }
    });

    it('is handed the foundation and may not import it', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/alerts/boot.ts',
          [
            "import type { GhostLogger } from '@tryghost/logging';",
            "import type { Foundation } from '../../core/kernel/foundation';",
            "const logging = require('@tryghost/logging');",
            "const events = require('@tryghost/domain-events');",
            "const config = require('../../core/shared/config');",
            "const db = require('../../core/server/data/db');",
            "const application = require('../../core/bootstrap/app');",
            "const { createLogger } = require('../../core/foundry/logging');",
            'export default [logging, events, config, db, application, createLogger] as unknown as (GhostLogger | Foundation)[];',
          ].join('\n'),
        ),
        [
          'domain-foundation-injected: domains/alerts/boot.ts → @tryghost/domain-events',
          'domain-foundation-injected: domains/alerts/boot.ts → @tryghost/logging',
          'domain-foundation-injected: domains/alerts/boot.ts → core/bootstrap/app.ts',
          'domain-foundation-injected: domains/alerts/boot.ts → core/foundry/logging.ts',
          'domain-foundation-injected: domains/alerts/boot.ts → core/server/data/db/index.js',
          'domain-foundation-injected: domains/alerts/boot.ts → core/shared/config/index.js',
          'foundry-only-from-bootstrap: domains/alerts/boot.ts → core/foundry/logging.ts',
        ],
      );
    });
  });

  describe('service roots', () => {
    it('import their own domain and the kernel, and nothing from outside', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/library/services/overdue/index.ts',
          [
            "import { defineService } from '../../../../core/kernel/define-service';",
            "import { parseConfigSlice } from '../../../../core/kernel/config';",
            "import type { LibraryDependencies } from '../../boot';",
            "import BookLent from '../../events/book-lent.event';",
            "import { listNotices } from '../../../notices/actions/list-notices.action';",
            "const sentry = require('../../../../core/shared/sentry');",
            "const staff = require('../../../../core/server/services/staff');",
            "const logging = require('@tryghost/logging');",
            "const legacy = require('../../transition/services/old-catalogue/legacy');",
            'export default defineService("Overdue", (given: LibraryDependencies) => [given, parseConfigSlice, BookLent, listNotices, sentry, staff, logging, legacy]);',
          ].join('\n'),
        ),
        [
          // The foundation is injected; shared, legacy and another domain's
          // actions belong in boot.ts. Its own transition/ folder is its own domain.
          'domain-foundation-injected: domains/library/services/overdue/index.ts → @tryghost/logging',
          'domain-implementation-imports: domains/library/services/overdue/index.ts → @tryghost/logging',
          'domain-implementation-imports: domains/library/services/overdue/index.ts → core/server/services/staff/index.ts',
          'domain-implementation-imports: domains/library/services/overdue/index.ts → core/shared/sentry.js',
          'domain-implementation-imports: domains/library/services/overdue/index.ts → domains/notices/actions/list-notices.action.ts',
        ],
      );
    });
  });

  describe('kernel and foundry', () => {
    const kernel = [
      "import { parseConfigSlice } from 'KERNEL/config';",
      "import { defineJob } from 'KERNEL/domains/definitions';",
      "import { discoverDomains } from 'KERNEL/domains/discover';",
      "import { createDomainLayer } from 'KERNEL/domains/domain-layer';",
      "import { getUnixTime } from 'KERNEL/clock';",
      "import { createLoggerFake } from 'KERNEL/testing';",
      'export const used = [parseConfigSlice, defineJob, discoverDomains, createDomainLayer, getUnixTime, createLoggerFake];',
    ].join('\n');
    const everyRule = () => {
      const result = spawnSync(
        process.execPath,
        [
          cli,
          'ghost/core',
          'ghost/domains',
          '--config',
          '.dependency-cruiser.cjs',
          '--output-type',
          'json',
        ],
        { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
      );
      return (JSON.parse(result.stdout) as ICruiseResult).summary.violations
        .filter(({ rule }) => rule.severity === 'error')
        .map(({ rule, from, to }) => `${rule.name}: ${from} → ${to}`);
    };

    // Anything in the kernel can be imported by any code, whatever else that code may import.
    for (const [where, file, up] of [
      ['a service implementation file', 'ghost/core/server/services/staff/reach.ts', '../../..'],
      ['a service root', 'ghost/core/server/services/staff/index.ts', '../../..'],
      ['the front end', 'ghost/core/frontend/helpers/reach.ts', '../..'],
      ['shared code', 'ghost/core/shared/reach.ts', '..'],
      ['the web layer', 'ghost/core/server/web/api/reach.ts', '../../..'],
      ['a model', 'ghost/core/server/models/reach.ts', '../..'],
      [
        'an implementation file in a domain',
        'ghost/domains/library/repositories/reach.repository.ts',
        '../../../core',
      ],
      ['a fragment', 'ghost/domains/notices/settings.ts', '../../core'],
      ['a listener', 'ghost/domains/notices/listeners/reach.listener.ts', '../../../core'],
      ['a domain file', 'ghost/domains/alerts/boot.ts', '../../core'],
      [
        'code moved in but not reshaped',
        'ghost/domains/library/transition/services/old-catalogue/reach.ts',
        '../../../../../core',
      ],
      ['the foundry', 'ghost/core/foundry/reach.ts', '..'],
      ['the bootstrap', 'ghost/core/bootstrap/reach.ts', '..'],
    ] as const) {
      it(`lets ${where} import anything in the kernel`, () => {
        const existing = file.endsWith('staff/index.ts');
        write(file, kernel.replaceAll('KERNEL', `${up}/kernel`));
        try {
          assert.deepEqual(everyRule(), []);
        } finally {
          if (existing) {
            write(file, 'export default {};');
          } else {
            rmSync(path.join(root, file));
            if (file.includes('/alerts/')) {
              rmSync(path.join(root, 'ghost/domains/alerts'), { recursive: true });
            }
          }
        }
      });
    }

    it('keeps one exception: only a service root imports defineService', () => {
      write(
        'ghost/core/server/web/api/reach.ts',
        "import { defineService } from '../../../kernel/define-service';\nexport const used = defineService;",
      );
      try {
        // An older rule, about where service roots live. It is written as an
        // import rule, so it is the one place the kernel is not freely importable.
        assert.deepEqual(everyRule(), [
          'service-roots-in-services: ghost/core/server/web/api/reach.ts → ghost/core/kernel/define-service.ts',
        ]);
      } finally {
        rmSync(path.join(root, 'ghost/core/server/web/api/reach.ts'));
      }
    });

    it("lets only the bootstrap and Ghost's config import the foundry", () => {
      const source =
        "import { createLogger } from 'UP/foundry/logging';\nimport type { Logger } from 'UP/kernel/logging';\nexport const used = createLogger as unknown as Logger;";
      const tried = (file: string, up: string) => {
        write(file, source.replaceAll('UP', up));
        try {
          return everyRule();
        } finally {
          rmSync(path.join(root, file));
        }
      };
      assert.deepEqual(tried('ghost/core/bootstrap/reach.ts', '..'), []);
      assert.deepEqual(tried('ghost/core/shared/config/reach.ts', '../..'), []);
      assert.deepEqual(tried('ghost/core/server/web/api/reach.ts', '../../..'), [
        'foundry-only-from-bootstrap: ghost/core/server/web/api/reach.ts → ghost/core/foundry/logging.ts',
      ]);
      assert.deepEqual(tried('ghost/core/frontend/helpers/reach.ts', '../..'), [
        'foundry-only-from-bootstrap: ghost/core/frontend/helpers/reach.ts → ghost/core/foundry/logging.ts',
      ]);
      assert.deepEqual(tried('ghost/core/kernel/reach.ts', '..'), [
        'foundry-only-from-bootstrap: ghost/core/kernel/reach.ts → ghost/core/foundry/logging.ts',
        'kernel-not-application: ghost/core/kernel/reach.ts → ghost/core/foundry/logging.ts',
      ]);
    });

    it('keeps the foundry free of the application it assembles', () => {
      write(
        'ghost/core/foundry/reach.ts',
        "const config = require('../shared/config');\nconst application = require('../bootstrap/app');\nexport const used = [config, application];",
      );
      try {
        assert.deepEqual(everyRule(), [
          'foundry-not-application: ghost/core/foundry/reach.ts → ghost/core/bootstrap/app.ts',
          'foundry-not-application: ghost/core/foundry/reach.ts → ghost/core/shared/config/index.js',
        ]);
      } finally {
        rmSync(path.join(root, 'ghost/core/foundry/reach.ts'));
      }
    });
  });

  describe('fragments', () => {
    for (const fragment of ['settings', 'permissions', 'schema', 'http/routes']) {
      it(`${fragment}.ts imports only the kernel, types and its own data`, () => {
        const up = fragment.includes('/') ? '../' : './';
        const core = fragment.includes('/') ? '../../../core' : '../../core';
        assert.deepEqual(
          violationsOf(
            `ghost/domains/notices/${fragment}.ts`,
            [
              `import { defineSettings } from '${core}/kernel/domains/definitions';`,
              `import type { Notice } from '${up}data/notice.data';`,
              `import type { NoticeService } from '${up}services/notices/notice.service';`,
              `import notices from '${up}services/notices';`,
              `import { getUnixTime } from '${core}/kernel/clock';`,
              "import errors from '@tryghost/errors';",
              'export default defineSettings({ groups: {} });',
              'export const used = [notices, getUnixTime, errors] as unknown as (Notice | NoticeService)[];',
            ].join('\n'),
          ),
          [
            // Any kernel file is fine: the clock import is not reported.
            `domain-fragment-imports: domains/notices/${fragment}.ts → @tryghost/errors`,
            `domain-fragment-imports: domains/notices/${fragment}.ts → domains/notices/services/notices/index.ts`,
          ],
        );
      });
    }
  });

  describe('the web layer', () => {
    it('rejects Express, auth middleware and the endpoint registry anywhere in a domain', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/library/http/reach.controller.ts',
          [
            "import express from 'express';",
            "const mw = require('../../../core/server/web/api/middleware');",
            "const api = require('../../../core/server/api/endpoints');",
            'export const used = [express, mw, api];',
          ].join('\n'),
        ),
        [
          'domain-implementation-imports: domains/library/http/reach.controller.ts → core/server/api/endpoints/index.js',
          'domain-implementation-imports: domains/library/http/reach.controller.ts → core/server/web/api/middleware.js',
          // Express is also a specialist dependency owned by the web layer, so
          // specialist-dependencies reports it as well.
          'domain-no-web-layer: domains/library/http/reach.controller.ts → core/server/api/endpoints/index.js',
          'domain-no-web-layer: domains/library/http/reach.controller.ts → core/server/web/api/middleware.js',
          'domain-no-web-layer: domains/library/http/reach.controller.ts → express',
        ],
      );
    });

    it('rejects them in a service root too', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/notices/services/web/index.ts',
          "const mw = require('../../../../core/server/web/api/middleware');\nexport default mw;",
        ),
        [
          // A root is held to the same imports as any other reshaped file now.
          'domain-implementation-imports: domains/notices/services/web/index.ts → core/server/web/api/middleware.js',
          'domain-no-web-layer: domains/notices/services/web/index.ts → core/server/web/api/middleware.js',
        ],
      );
    });
  });

  describe('transition', () => {
    it('applies none of the domain rules to code under transition/', () => {
      assert.deepEqual(
        violationsOf(
          'ghost/domains/library/transition/services/old-catalogue/reach.js',
          [
            "const express = require('express');",
            "const notices = require('../../../../notices/services/notices');",
            'module.exports = [express, notices];',
          ].join('\n'),
        ).filter((violation) => violation.startsWith('domain-')),
        [],
      );
    });
  });
});
