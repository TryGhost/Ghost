import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { checkoutEnv, checkouts, unusedDatabases, unusedE2eNames } from './lib/dev-stack.ts';
import { checkoutRoot } from '../scripts/lib/ghost-dev-env.ts';

// Lists what's left behind in the shared services: dev_* databases and interrupted e2e runs'
// containers, databases and snapshots of worktrees that no longer exist, and killed DB test runs'
// databases; --yes removes them
const { values } = parseArgs({ options: { yes: { type: 'boolean', default: false } } });

const password = process.env.MYSQL_ROOT_PASSWORD ?? 'root';
const run = (command: string, args: string[], input?: string) =>
  execFileSync(command, args, {
    cwd: checkoutRoot,
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
const inMysql = (args: string[], input?: string) =>
  run(
    'docker',
    [
      'compose',
      '-f',
      'compose.dev.yaml',
      'exec',
      '-T',
      '-e',
      `MYSQL_PWD=${password}`,
      'mysql',
      ...args,
    ],
    input,
  );
const mysql = (sql: string) => inMysql(['mysql', '-uroot', '-N'], sql);
const rows = (output: string) =>
  output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((row) => row.split('\t'));

let sizes: Map<string, number>;
try {
  sizes = new Map(
    rows(
      // A DB test run holds a lock named after its databases' prefix until it has dropped them.
      // Runs from checkouts that predate the lock count as live while connected to one of them
      mysql(
        `SELECT s.schema_name, COALESCE(SUM(t.data_length + t.index_length), 0)
        FROM information_schema.schemata s
        LEFT JOIN information_schema.tables t ON t.table_schema = s.schema_name
        WHERE s.schema_name LIKE 'dev\\_%' OR s.schema_name LIKE 'ghost\\_e2e\\_%'
        OR (s.schema_name REGEXP '^ghost_testing_[0-9a-f]{8}_'
          AND IS_USED_LOCK(SUBSTRING_INDEX(s.schema_name, '_', 3)) IS NULL
          AND SUBSTRING_INDEX(s.schema_name, '_', 3) NOT IN (
            SELECT SUBSTRING_INDEX(db, '_', 3) FROM performance_schema.processlist WHERE db IS NOT NULL))
        GROUP BY s.schema_name`,
      ),
    ).map(([name = '', size]): [string, number] => [name, Number(size)]),
  );
} catch {
  console.error("Couldn't query MySQL. `pnpm dev` starts it.");
  process.exit(1);
}

// The main checkout's database is ghost_dev and its e2e names carry no key
const [, ...worktrees] = checkouts();
const existing = worktrees.filter((root) => existsSync(root));
const databases = [
  ...unusedDatabases(
    [...sizes.keys()],
    existing.map((root) => ({ root, env: checkoutEnv(root) })),
  ),
  ...unusedE2eNames([...sizes.keys()], existing),
  ...[...sizes.keys()].filter((name) => name.startsWith('ghost_testing_')),
];
const allContainers = rows(
  run('docker', ['ps', '-a', '--format', '{{.Label "com.docker.compose.project"}}\t{{.Names}}']),
);
const projects = new Set(
  unusedE2eNames(
    allContainers.map(([project = '']) => project),
    existing,
  ),
);
const containers = allContainers
  .filter(([project = '']) => projects.has(project))
  .map(([, name = '']) => name);
const snapshots = unusedE2eNames(
  rows(inMysql(['ls', '/tmp'])).map(([file = '']) => file),
  existing,
).map((file) => `/tmp/${file}`);

if (databases.length + containers.length + snapshots.length === 0) {
  console.log('Nothing is left behind in the shared services.');
  process.exit(0);
}
console.log(
  values.yes
    ? "Removing what's left behind in the shared services:"
    : 'Left behind in the shared services:',
);
for (const name of databases) {
  console.log(`  ${name}  ${Math.round((sizes.get(name) ?? 0) / 1024 ** 2)} MB`);
  if (values.yes) {
    mysql(`DROP DATABASE \`${name}\``);
  }
}
for (const name of containers) {
  console.log(`  ${name} container`);
}
for (const path of snapshots) {
  console.log(`  ${path} in the MySQL container`);
}
if (values.yes) {
  if (containers.length > 0) {
    run('docker', ['rm', '-f', ...containers]);
  }
  if (snapshots.length > 0) {
    inMysql(['rm', '-f', ...snapshots]);
  }
} else {
  console.log('Remove them with `pnpm dev:gc --yes`.');
}
