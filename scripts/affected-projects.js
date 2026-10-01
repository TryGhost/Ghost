// Computes job_setup's project lists and matrices for ci.yml, printed as
// GITHUB_OUTPUT `key=value` lines.
//
// nx's own lockfile diff only compares package versions, so a project
// switching between versions that both stay in the lockfile goes unseen; nx.json
// turns it off and lockfileChangedFiles reports those projects instead, added
// to every --affected query along with their dependents.

import { parseArgs } from 'node:util';
import { $ } from 'execa';

import { buildMatrix } from './build-public-apps-matrix.js';
import { computeAffectedOutputs } from './lib/affected-projects.js';
import { ROOT_DIR } from './lib/constants.js';
import { lockfileChangedFiles } from './lib/lockfile.js';

// String flags so the workflow can pass path-filter outputs straight through.
const { values } = parseArgs({
  options: {
    base: { type: 'string', default: '' },
    head: { type: 'string', default: '' },
    tag: { type: 'string', default: 'false' },
    'code-changed': { type: 'string', default: 'true' },
    'ci-changed': { type: 'string', default: 'false' },
    'unit-test-globals-changed': { type: 'string', default: 'false' },
    'core-unit-test-globals-changed': { type: 'string', default: 'false' },
  },
});

const flag = (name) => values[name] === 'true';
const isTag = flag('tag');

if (!isTag && (!values.base || !values.head)) {
  console.error('--base and --head are required outside tag builds');
  process.exit(1);
}

const changedFiles = isTag ? [] : await lockfileChangedFiles(values.base, values.head);
// The root importer widens the test lanes instead (see computeAffectedOutputs):
// handed to --files, nx can't diff root package.json and marks every project.
const rootDependenciesChanged = changedFiles.includes('package.json');
const lockfileFiles = changedFiles.filter((file) => file !== 'package.json');

async function nxShowProjects(args) {
  const { stdout } = await $({ cwd: ROOT_DIR })`pnpm nx show projects ${args} --json`;
  return JSON.parse(stdout);
}

async function showProjects({ affected, withTarget, projects }) {
  const filters = [
    ...(withTarget ? ['--withTarget', withTarget] : []),
    ...(projects ? ['--projects', projects] : []),
  ];
  if (!affected) {
    return nxShowProjects(filters);
  }

  const range = ['--affected', '--base', values.base, '--head', values.head];
  const found = await nxShowProjects([...range, ...filters]);
  if (!lockfileFiles.length) {
    return found;
  }

  const fromLockfile = await nxShowProjects([
    '--affected',
    `--files=${lockfileFiles.join(',')}`,
    ...filters,
  ]);
  return [...new Set([...found, ...fromLockfile])];
}

const outputs = await computeAffectedOutputs(
  {
    isTag,
    codeChanged: flag('code-changed'),
    ciChanged: flag('ci-changed'),
    rootDependenciesChanged,
    unitTestGlobalsChanged: flag('unit-test-globals-changed'),
    coreUnitTestGlobalsChanged: flag('core-unit-test-globals-changed'),
  },
  showProjects,
  buildMatrix,
);

// Stdout is the contract — the workflow appends it to $GITHUB_OUTPUT.
for (const [key, value] of Object.entries(outputs)) {
  process.stdout.write(`${key}=${value}\n`);
}
