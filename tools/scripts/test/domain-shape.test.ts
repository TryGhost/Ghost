import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  checkDomainShape,
  countTransitionFiles,
  crossDomainRelations,
} from '../lib/domain-shape.ts';

const repository = path.resolve(import.meta.dirname, '../../..');
const fixtures = path.join(repository, 'ghost/test/utils/fixtures/domains');

describe('domain shape and names', () => {
  let root: string;
  let domains: string;
  const write = (file: string, source = '') => {
    mkdirSync(path.dirname(path.join(domains, file)), { recursive: true });
    writeFileSync(path.join(domains, file), source);
  };
  const problems = () => checkDomainShape(domains).map(({ rule, file }) => `${rule}: ${file}`);

  // A copy of the fixture domains that each test breaks in one way.
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'ghost-domain-shape-'));
    domains = path.join(root, 'ghost/domains');
    cpSync(fixtures, domains, { recursive: true });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('accepts the fixture domains as they are', () => {
    assert.deepEqual(checkDomainShape(fixtures), []);
  });

  describe('the domain root', () => {
    it('requires CONTEXT.md', () => {
      rmSync(path.join(domains, 'notices/CONTEXT.md'));
      assert.deepEqual(problems(), ['domain-root-shape: notices/CONTEXT.md']);
    });

    it('rejects any file or folder the rules do not name', () => {
      write('library/utils.ts');
      write('library/README.md');
      write('library/index.ts');
      write('library/lib/helper.ts');
      write('library/models/book.js');
      assert.deepEqual(problems(), [
        'domain-root-shape: library/README.md',
        'domain-root-shape: library/index.ts',
        'domain-root-shape: library/lib',
        'domain-root-shape: library/models',
        'domain-root-shape: library/utils.ts',
      ]);
    });

    it('accepts every named file and folder, and ignores build output beside a source file', () => {
      write('notices/boot.ts');
      write('notices/boot.js');
      write('notices/settings.ts');
      write('notices/settings.js');
      write('notices/jobs/tidy.job.ts');
      write('notices/jobs/tidy.job.js');
      assert.deepEqual(problems(), []);
    });

    it('allows only domain folders, the README and the manifest beside the domains', () => {
      write('README.md');
      write('manifest.txt');
      write('shared.ts');
      write('Billing/CONTEXT.md');
      assert.deepEqual(problems(), ['domain-root-shape: Billing', 'domain-root-shape: shared.ts']);
    });

    it('keeps services/ to one folder per root, each with an index.ts', () => {
      write('library/services/helpers.ts');
      write('library/services/empty/empty.service.ts');
      assert.deepEqual(problems(), [
        'domain-root-shape: library/services/empty/index.ts',
        'domain-root-shape: library/services/helpers.ts',
        // The stray file also has no role.
        'domain-file-naming: library/services/helpers.ts',
      ]);
    });

    it('keeps transition/ and test/ to their named folders', () => {
      write('library/transition/listeners/old.js');
      write('library/transition/notes.md');
      write('library/test/e2e-api/books.test.js');
      write('library/test/utils.ts');
      assert.deepEqual(problems(), [
        'domain-root-shape: library/transition/listeners',
        'domain-root-shape: library/transition/notes.md',
        'domain-root-shape: library/test/e2e-api',
        'domain-root-shape: library/test/utils.ts',
      ]);
    });
  });

  describe('file names', () => {
    it('requires a role on every reshaped file', () => {
      write('library/services/catalogue/helpers.ts');
      write('library/repositories/book-store.ts');
      write('library/http/books.ts');
      assert.deepEqual(problems(), [
        'domain-file-naming: library/http/books.ts',
        'domain-file-naming: library/services/catalogue/helpers.ts',
        'domain-file-naming: library/repositories/book-store.ts',
      ]);
    });

    it('requires the role to belong to the folder', () => {
      write('library/listeners/recall.job.ts');
      write('library/actions/book.service.ts');
      assert.deepEqual(problems(), [
        'domain-file-naming: library/actions/book.service.ts',
        'domain-file-naming: library/listeners/recall.job.ts',
      ]);
    });

    it('requires lower case, hyphens and TypeScript', () => {
      write('library/entities/Book.entity.ts');
      write('library/entities/book_copy.entity.ts');
      write('library/jobs/tidy.job.js');
      assert.deepEqual(problems(), [
        'domain-file-naming: library/entities/Book.entity.ts',
        'domain-file-naming: library/entities/book_copy.entity.ts',
        'domain-file-naming: library/jobs/tidy.job.js',
      ]);
    });

    it('keeps the fixed names to their own place', () => {
      // index.ts is a service root's name and routes.ts is http/'s.
      write('library/services/catalogue/pricing/index.ts');
      write('library/http/admin/routes.ts');
      write('library/repositories/index.ts');
      assert.deepEqual(problems(), [
        'domain-file-naming: library/http/admin/routes.ts',
        'domain-file-naming: library/services/catalogue/pricing/index.ts',
        'domain-file-naming: library/repositories/index.ts',
      ]);
    });

    it('allows capability subfolders inside a layer', () => {
      write('library/repositories/loans/loan.repository.ts');
      write('library/services/catalogue/search/search.service.ts');
      write('library/emails/loans/overdue.template.hbs');
      assert.deepEqual(problems(), []);
    });

    it('leaves the names of files in transition/ and test/ alone', () => {
      write('library/transition/services/old-catalogue/OldThing.js');
      write('library/transition/models/Old_Book.js');
      write('library/test/unit/services/catalogue/Whatever.test.js');
      assert.deepEqual(problems(), []);
    });
  });

  describe('the transition count', () => {
    it('counts source files under each transition folder', () => {
      assert.deepEqual(countTransitionFiles(fixtures), [
        { domain: 'library', files: 4, byFolder: { events: 1, models: 1, services: 2 } },
        { domain: 'notices', files: 0, byFolder: {} },
      ]);
    });
  });

  describe('relations that cross a domain', () => {
    it('reports Bookshelf relations, foreign keys and withRelated, attributing what it can', () => {
      const core = path.join(root, 'ghost/core/server/models');
      mkdirSync(core, { recursive: true });
      writeFileSync(
        path.join(core, 'user.js'),
        "const User = ghostBookshelf.Model.extend({ tableName: 'users', loans() { return this.hasMany('Loan', 'user_id'); }, roles() { return this.belongsToMany('Role'); } });\nmodule.exports = { User: ghostBookshelf.model('User', User) };",
      );
      writeFileSync(
        path.join(core, 'role.js'),
        "module.exports = { Role: ghostBookshelf.model('Role', ghostBookshelf.Model.extend({ tableName: 'roles' })) };",
      );
      write(
        'library/transition/models/loan.js',
        "const Loan = ghostBookshelf.Model.extend({ tableName: 'loans', user() { return this.belongsTo('User', 'user_id'); }, book() { return this.belongsTo('Book', 'book_id'); } });\nmodule.exports = { Loan: ghostBookshelf.model('Loan', Loan) };",
      );
      write(
        'library/transition/models/book.js',
        "module.exports = { Book: ghostBookshelf.model('Book', ghostBookshelf.Model.extend({ tableName: 'books' })) };",
      );
      write(
        'notices/transition/models/notice.js',
        "const Notice = ghostBookshelf.Model.extend({ tableName: 'notices', loan() { return this.belongsTo('Loan'); } });\nmodule.exports = { Notice: ghostBookshelf.model('Notice', Notice) };",
      );
      write(
        'library/schema.ts',
        [
          'export default defineSchema({',
          '  tables: {',
          '    books: {',
          "      id: { type: 'string' },",
          '    },',
          '    loans: {',
          "      book_id: { type: 'string', references: 'books.id' },",
          "      user_id: { type: 'string', references: 'users.id' },",
          '    },',
          '  },',
          '});',
        ].join('\n'),
      );
      write(
        'notices/repositories/notice.repository.ts',
        "export const find = (model) => model.findAll({ withRelated: ['loan', 'loan.user'] });",
      );

      assert.deepEqual(
        crossDomainRelations(root, domains).map(
          ({ kind, file, from, to, detail }) => `${kind}: ${file}: ${detail} (${from} → ${to})`,
        ),
        [
          // Two models both outside the domains are not reported: User → Role.
          'bookshelf-relation: ghost/core/server/models/user.js: User hasMany Loan (core → library)',
          // Loan → Book stays inside library and is not reported.
          'bookshelf-relation: ghost/domains/library/transition/models/loan.js: Loan belongsTo User (library → core)',
          'bookshelf-relation: ghost/domains/notices/transition/models/notice.js: Notice belongsTo Loan (notices → library)',
          "foreign-key: ghost/domains/library/schema.ts: references 'users.id' (library → core)",
          // withRelated names relations, not models, so its target is not known.
          'with-related: ghost/domains/notices/repositories/notice.repository.ts: withRelated loan, loan.user (notices → unknown)',
        ],
      );
    });
  });
});
