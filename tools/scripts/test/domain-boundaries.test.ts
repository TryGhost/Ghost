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
        from: 'ghost/test/utils/fixtures/second-application',
        to: 'ghost/core/bootstrap/second-application',
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
      .filter(({ rule }) => rule.name.startsWith('domain-'))
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

    it("accepts another domain's data and events anywhere, and its actions in a service root", () => {
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

    it("rejects another domain's action in an implementation file: the root injects it", () => {
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

    it("rejects another domain's transition folder outside a service root", () => {
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

  describe('service roots and the domain file', () => {
    it('counts legacy and transition imports without failing', () => {
      write(
        'ghost/domains/alerts/boot.ts',
        [
          "const staff = require('../../core/server/services/staff');",
          "const config = require('../../core/shared/config');",
          "const legacy = require('../library/transition/services/old-catalogue/legacy');",
          'export default { staff, config, legacy };',
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
            // Config is foundation, so it is not counted.
            'domain-legacy-imports: domains/alerts/boot.ts → core/server/services/staff/index.ts',
            'domain-transition-imports: domains/alerts/boot.ts → domains/library/transition/services/old-catalogue/legacy.js',
          ],
        );
      } finally {
        rmSync(path.join(root, 'ghost/domains/alerts'), { recursive: true });
      }
    });
  });

  describe('fragments', () => {
    for (const fragment of ['settings', 'permissions', 'schema', 'http/routes']) {
      it(`${fragment}.ts imports only its kernel utility, types and its own data`, () => {
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
            `domain-fragment-imports: domains/notices/${fragment}.ts → @tryghost/errors`,
            `domain-fragment-imports: domains/notices/${fragment}.ts → core/kernel/clock.ts`,
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
