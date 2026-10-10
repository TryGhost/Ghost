import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { checkoutEnv, checkouts, unusedDatabases } from './lib/dev-stack.ts';
import { checkoutRoot } from './lib/ghost-dev-env.ts';

// Lists the dev_* databases in the shared MySQL whose worktree no longer exists; --yes drops them
const { values } = parseArgs({ options: { yes: { type: 'boolean', default: false } } });

const password = process.env.MYSQL_ROOT_PASSWORD ?? 'root';
const mysql = (sql: string) =>
  execFileSync(
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
      'mysql',
      '-uroot',
      '-N',
    ],
    { cwd: checkoutRoot, encoding: 'utf8', input: sql, stdio: ['pipe', 'pipe', 'inherit'] },
  );

let sizes: Map<string, number>;
try {
  const rows = mysql(
    "SELECT s.schema_name, COALESCE(SUM(t.data_length + t.index_length), 0) FROM information_schema.schemata s LEFT JOIN information_schema.tables t ON t.table_schema = s.schema_name WHERE s.schema_name LIKE 'dev\\_%' GROUP BY s.schema_name",
  );
  sizes = new Map(
    rows
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((row): [string, number] => {
        const [name = '', size] = row.split('\t');
        return [name, Number(size)];
      }),
  );
} catch {
  console.error("Couldn't query MySQL. `pnpm dev` starts it.");
  process.exit(1);
}

// The main checkout's database is ghost_dev
const [, ...worktrees] = checkouts();
const unused = unusedDatabases(
  [...sizes.keys()],
  worktrees.filter((root) => existsSync(root)).map((root) => ({ root, env: checkoutEnv(root) })),
);
if (unused.length === 0) {
  console.log('Every dev_ database belongs to an existing worktree.');
  process.exit(0);
}
console.log(
  values.yes
    ? 'Dropping the databases of worktrees that no longer exist:'
    : 'Databases of worktrees that no longer exist:',
);
for (const name of unused) {
  console.log(`  ${name}  ${Math.round((sizes.get(name) ?? 0) / 1024 ** 2)} MB`);
  if (values.yes) {
    mysql(`DROP DATABASE \`${name}\``);
  }
}
if (!values.yes) {
  console.log('Drop them with `pnpm dev:gc --yes`.');
}
