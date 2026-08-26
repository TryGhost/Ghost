import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, test } from 'node:test';

import {
  checkAgentGuidance,
  countLines,
  listTrackedAgentGuidance,
} from '../check-agent-guidance.js';

const execFileAsync = promisify(execFile);
const temporaryDirectories = [];

async function createRepository() {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'ghost-agent-guidance-'));
  temporaryDirectories.push(rootDirectory);
  await execFileAsync('git', ['init'], { cwd: rootDirectory });
  return rootDirectory;
}

async function addFile(rootDirectory, file, content, { tracked = true } = {}) {
  const filePath = path.join(rootDirectory, file);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);

  if (tracked) {
    await execFileAsync('git', ['add', file], { cwd: rootDirectory });
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

test('counts files with and without a trailing newline', () => {
  assert.equal(countLines('one\ntwo\n'), 2);
  assert.equal(countLines('one\ntwo'), 2);
  assert.equal(countLines(''), 0);
});

test('finds tracked root and nested AGENTS.md files only', async () => {
  const rootDirectory = await createRepository();
  await addFile(rootDirectory, 'AGENTS.md', 'root\n');
  await addFile(rootDirectory, 'nested/AGENTS.md', 'nested\n');
  await addFile(rootDirectory, 'ignored/AGENTS.md', 'untracked\n', { tracked: false });

  assert.deepEqual(await listTrackedAgentGuidance(rootDirectory), [
    'AGENTS.md',
    'nested/AGENTS.md',
  ]);
});

test('accepts an AGENTS.md at the line limit', async () => {
  const rootDirectory = await createRepository();
  await addFile(rootDirectory, 'AGENTS.md', 'line\n'.repeat(150));

  assert.deepEqual(await checkAgentGuidance(rootDirectory), []);
});

test('reports the path and count above the line limit', async () => {
  const rootDirectory = await createRepository();
  await addFile(rootDirectory, 'nested/AGENTS.md', 'line\n'.repeat(151));

  assert.deepEqual(await checkAgentGuidance(rootDirectory), [
    'nested/AGENTS.md has 151 lines (maximum 150)',
  ]);
});
