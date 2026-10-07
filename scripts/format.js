// Oxfmt 0.63.0 is not always idempotent: a handful of files (deeply nested
// generic and call shapes) only stabilise on a second pass, so a single format
// could pass the pre-commit hook and still fail `format:check` in CI. Format,
// then re-format once more if a check of the same paths reports drift.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const oxfmt = (extraArgs, stdio) =>
  spawnSync('pnpm', ['exec', 'oxfmt', ...extraArgs, ...args], { stdio }).status ?? 1;

let status = oxfmt([], 'inherit');
if (status === 0 && oxfmt(['--check'], 'ignore') !== 0) {
  status = oxfmt([], 'inherit');
}
process.exit(status);
