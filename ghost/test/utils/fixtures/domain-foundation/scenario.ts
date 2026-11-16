import path from 'node:path';
import { discoverDomains, describeManifest } from '../../../../core/kernel/domains/discover';
import { createDomainLayer, type ScheduledJob } from '../../../../core/kernel/domains/domain-layer';
import { bus, journal, reset } from './index';

// Starts the fixture domains through discovery and reports what happened as
// plain data. The same file runs under the unit test runner and, compiled by
// tsc, under plain node, so both can be held to one expected result.

const root = path.resolve(__dirname, '../domains');

// The fixture files Node has loaded so far, without extensions.
function loadedFixtureFiles() {
  return Object.keys(require.cache)
    .filter((file) => file.startsWith(root + path.sep))
    .map((file) =>
      path
        .relative(root, file)
        .split(path.sep)
        .join('/')
        .replace(/\.(?:ts|js)$/, ''),
    )
    .sort();
}

const newlyLoaded = (before: string[]) => loadedFixtureFiles().filter((file) => !before.includes(file));

export async function runScenario() {
  reset();
  const manifest = discoverDomains(root);
  const found = describeManifest(manifest);
  const loadedByDiscovery = loadedFixtureFiles();

  const scheduled: ScheduledJob[] = [];
  const errors: unknown[] = [];
  const layer = createDomainLayer({
    manifest,
    subscribe: bus.subscribe,
    schedule: (job) => scheduled.push(job),
    logging: { error: (...values: unknown[]) => errors.push(values) },
  });

  await layer.start();
  const journalAfterStart = [...journal];
  const loadedByStart = newlyLoaded(loadedByDiscovery);

  // A stand-in web layer: it mounts routes as data and loads a handler on its first request.
  const routes = layer.routes('admin');
  const mounted = routes.map(({ method, path: routePath, middleware, domain }) => ({
    domain,
    method,
    path: routePath,
    middleware,
  }));
  const afterMount = loadedFixtureFiles();
  const request = (routePath: string, frame: unknown) => {
    const handler = routes.find((route) => route.path === routePath)!.loadHandler() as (
      frame: unknown,
    ) => unknown;
    return handler(frame);
  };
  const loan = await request('/books/:id/loans', { params: { id: 'dune' }, body: { borrower: 'Ada' } });
  const books = await request('/books', { params: {} });
  const loadedByFirstRequest = newlyLoaded(afterMount);

  // Lending published BookLent; the other domain listened and called back through an action.
  const { listNotices } = require(path.join(root, 'notices/actions/list-notices.action'));
  const notices = listNotices();

  const beforeReady = loadedFixtureFiles();
  const scheduledBeforeReady = scheduled.length;
  await layer.ready();
  const journalAfterReady = journal.slice(journalAfterStart.length);
  const loadedByReady = newlyLoaded(beforeReady);
  const jobs = scheduled.map(({ name, schedule }) => ({ name, schedule }));
  for (const job of scheduled) {
    await job.run();
  }
  const journalAfterJobs = journal.slice(journalAfterStart.length + journalAfterReady.length);

  const beforeFragments = loadedFixtureFiles();
  const settings = layer.fragments<{
    groups: unknown;
    calculated: Record<string, { inputs: string[]; calculate(inputs: object): unknown }>;
  }>('settings');
  const fragments = {
    settings: settings.map(({ domain, value }) => ({ domain, groups: value.groups })),
    calculated: settings[0]!.value.calculated.library_loan_weeks!.calculate({ library_loan_days: 14 }),
    permissions: layer.fragments('permissions'),
    schema: layer.fragments('schema'),
  };
  const loadedByFragments = newlyLoaded(beforeFragments);

  // Stopping and starting again, as tests that boot Ghost repeatedly do.
  await layer.stop();
  await bus.dispatch(new (require(path.join(root, 'library/events/book-lent.event')).default)({
    bookId: 'emma',
    borrower: 'Ignored',
    lentAt: '',
  }));
  const noticesWhileStopped = listNotices().length;
  await layer.start();
  const subscriptionsAfterRestart = bus.subscriptions('BookLent');

  return {
    found,
    loadedByDiscovery,
    journalAfterStart,
    loadedByStart,
    mounted,
    loan,
    books,
    loadedByFirstRequest,
    notices,
    scheduledBeforeReady,
    journalAfterReady,
    loadedByReady,
    jobs,
    journalAfterJobs,
    fragments,
    loadedByFragments,
    noticesWhileStopped,
    subscriptionsAfterRestart,
    loadedFromTransitionOrTest: loadedFixtureFiles().filter((file) => /\/(transition|test)\//.test(file)),
    errors,
  };
}

// Run directly, it prints the result: `node scenario.js` against built JavaScript.
if (require.main === module) {
  runScenario().then(
    (result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`),
    (error) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
