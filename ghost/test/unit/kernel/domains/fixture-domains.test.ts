import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ghost = path.resolve(__dirname, '../../../..');
const scenarioFile = 'test/utils/fixtures/second-application/scenario';
// The compiler `pnpm build:tsc` runs.
const compiler = path.join(ghost, 'node_modules/.bin/tsc');

type Scenario = Awaited<
  ReturnType<typeof import('../../../utils/fixtures/second-application/scenario').runScenario>
>;

// Two fixture domains that between them hold every kind of file. Library owns
// books; notices listens to library's event and calls library's action. The
// same expectations hold however the files were loaded.
function assertScenario(result: Scenario) {
  // The application built its foundation from its own values, once, in order,
  // and only when asked: finding the domains built nothing.
  assert.deepEqual(result.application, {
    name: 'Lending desk',
    builtBeforeAnythingAsked: [],
    builtByDiscovery: [],
    built: ['config', 'logging', 'database', 'events'],
    // defaults.json says "Front desk"; env/config.testing.json overrides it.
    deskName: 'Test desk',
    loanDays: 14,
    hasDatabase: false,
    logger: { name: 'lending-desk', level: 'info', transports: ['file'] },
    // Written by a service root that was handed the logger and its config slice.
    logged: ['The catalogue is open at the Test desk for loans of 14 days'],
  });

  // Found by reading the folders, and nothing loaded by finding it.
  assert.deepEqual(result.found, [
    'action      library/actions/describe-book.action',
    'action      library/actions/lend-book.action',
    'domain      library/boot',
    'event       library/events/book-lent.event',
    'routes      library/http/routes',
    'job         library/jobs/recall-overdue-books.job',
    'permissions library/permissions',
    'schema      library/schema',
    'service     library/services/catalogue/index',
    'service     library/services/lending/index',
    'service     library/services/reports/index',
    'settings    library/settings',
    'action      notices/actions/list-notices.action',
    'domain      notices/boot',
    'event       notices/events/notice-recorded.event',
    'listener    notices/listeners/record-loan-notice.listener',
    'service     notices/services/notices/index',
  ]);
  assert.deepEqual(result.loadedByDiscovery, []);

  // Roots start in the order they declare within a domain. Reports does not block boot.
  const started = result.journalAfterStart;
  assert.deepEqual([...started].sort(), ['start catalogue', 'start lending', 'start notices']);
  assert.ok(started.indexOf('start catalogue') < started.indexOf('start lending'));

  // Starting loads service roots and listeners and what they import, and no more.
  for (const file of [
    'library/boot',
    'library/services/catalogue/index',
    'library/services/lending/index',
    'notices/boot',
    'notices/services/notices/index',
    'notices/listeners/record-loan-notice.listener',
  ]) {
    assert.ok(result.loadedByStart.includes(file), `${file} is loaded when the domains start`);
  }
  for (const pattern of [/\/http\//, /\/jobs\//, /\/(settings|permissions|schema)$/]) {
    assert.deepEqual(
      result.loadedByStart.filter((file) => pattern.test(file)),
      [],
      `nothing matching ${pattern} is loaded when the domains start`,
    );
  }

  // Routes are data. A handler's file is loaded by its first request.
  assert.deepEqual(result.mounted, [
    { domain: 'library', method: 'get', path: '/books', middleware: ['authAdminApi'] },
    { domain: 'library', method: 'post', path: '/books/:id/loans', middleware: ['authAdminApi'] },
  ]);
  assert.deepEqual(result.loadedByFirstRequest, [
    'library/http/book.controller',
    'library/http/book.serializer',
    'library/http/book.validator',
  ]);
  assert.deepEqual(result.loan, {
    loans: [{ bookId: 'dune', borrower: 'Ada', lentAt: '2026-01-01T00:00:00.000Z' }],
  });
  assert.deepEqual(result.books, {
    books: [
      { id: 'dune', title: 'Dune', available: false },
      { id: 'emma', title: 'Emma', available: true },
    ],
  });

  // Library published BookLent; notices listened and asked library's action for the title.
  assert.deepEqual(result.notices, [{ subject: 'Dune was lent', body: 'Ada borrowed Dune.' }]);

  // Once Ghost is ready: the root that does not block boot, then jobs.
  assert.equal(result.scheduledBeforeReady, 0);
  assert.deepEqual(result.journalAfterReady, ['start reports']);
  assert.deepEqual(result.loadedByReady, ['library/jobs/recall-overdue-books.job']);
  assert.deepEqual(result.jobs, [
    { name: 'library/recall-overdue-books', schedule: { once: 'boot', delay: 10 } },
  ]);
  assert.deepEqual(result.journalAfterJobs, ['recalled 1']);

  // Fragments are loaded when a registry asks, and a calculated setting gets its inputs.
  assert.deepEqual(result.loadedByFragments, [
    'library/permissions',
    'library/schema',
    'library/settings',
  ]);
  assert.equal(result.fragments.calculated, 2);
  assert.deepEqual(
    result.fragments.settings.map(({ domain }) => domain),
    ['library'],
  );

  // Stop and start again: listeners ignore events while stopped and are not subscribed twice.
  assert.equal(result.noticesWhileStopped, 1);
  assert.equal(result.noticesAfterRestart, 2);

  // Nothing in transition/ or test/ is found, loaded or started.
  assert.deepEqual(result.loadedFromTransitionOrTest, []);
}

describe('fixture domains', function () {
  it('are found and started under the unit test runner', async function () {
    // Required, not imported: the fixtures are loaded by Node's require, and the
    // scenario must share its module instances with them.
    const {
      runScenario,
    }: typeof import('../../../utils/fixtures/second-application/scenario') = require(
      path.join(ghost, scenarioFile),
    );
    assertScenario(await runScenario());
  });

  describe('built with tsc', function () {
    let built: string;

    // Builds the framework (kernel and foundation) and the fixtures in place, as
    // build:tsc builds Ghost. Nothing else of Ghost is copied: the second
    // application runs on the framework alone.
    beforeAll(function () {
      built = mkdtempSync(path.join(tmpdir(), 'ghost-built-domains-'));
      for (const directory of [
        'core/kernel',
        'core/foundation',
        'test/utils/fixtures/domains',
        'test/utils/fixtures/second-application',
      ]) {
        cpSync(path.join(ghost, directory), path.join(built, directory), { recursive: true });
      }
      symlinkSync(path.join(ghost, 'node_modules'), path.join(built, 'node_modules'));
      writeFileSync(
        path.join(built, 'tsconfig.json'),
        JSON.stringify({
          extends: path.join(ghost, 'tsconfig.json'),
          compilerOptions: { incremental: false },
          include: [
            'core/kernel/**/*.ts',
            'core/foundation/**/*.ts',
            'test/utils/fixtures/**/*.ts',
          ],
          exclude: [],
        }),
      );
      const tsc = spawnSync(compiler, [], {
        cwd: built,
        encoding: 'utf8',
      });
      assert.equal(tsc.status, 0, tsc.stdout + tsc.stderr);
    }, 120_000);

    afterAll(function () {
      rmSync(built, { recursive: true, force: true });
    });

    // Plain node: no TypeScript loader and no source condition.
    function run() {
      const result = spawnSync(process.execPath, [`${scenarioFile}.js`], {
        cwd: built,
        encoding: 'utf8',
        env: { PATH: process.env.PATH, NODE_ENV: 'testing' },
      });
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout) as Scenario;
    }

    it('are found and started from JavaScript beside its TypeScript source', function () {
      // What a built checkout and the release archive hold: x.js beside x.ts.
      assertScenario(run());
    }, 60_000);

    it('are found and started from JavaScript alone', function () {
      // What the production image holds: its prune step removes the TypeScript.
      for (const entry of readdirSync(built, { recursive: true, withFileTypes: true })) {
        if (
          entry.isFile() &&
          entry.name.endsWith('.ts') &&
          !entry.parentPath.includes('node_modules')
        ) {
          rmSync(path.join(entry.parentPath, entry.name));
        }
      }
      assertScenario(run());
    }, 60_000);
  });
});
