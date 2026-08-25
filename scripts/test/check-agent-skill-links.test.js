import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { checkAgentSkillLinks } from '../check-agent-skill-links.js';

const temporaryDirectories = [];

async function createRepository() {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'ghost-agent-skills-'));
  temporaryDirectories.push(rootDirectory);
  await mkdir(path.join(rootDirectory, '.agents', 'skills', 'example'), { recursive: true });
  await mkdir(path.join(rootDirectory, '.claude', 'skills'), { recursive: true });
  await writeFile(
    path.join(rootDirectory, '.agents', 'skills', 'example', 'SKILL.md'),
    '---\nname: example\n---\n',
  );
  return rootDirectory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

test('accepts a correctly linked skill', async () => {
  const rootDirectory = await createRepository();
  await symlink(
    '../../.agents/skills/example',
    path.join(rootDirectory, '.claude', 'skills', 'example'),
  );

  assert.deepEqual(await checkAgentSkillLinks(rootDirectory), []);
});

test('reports a missing Claude link with the fix', async () => {
  const rootDirectory = await createRepository();

  assert.deepEqual(await checkAgentSkillLinks(rootDirectory), [
    'Missing Claude skill link: example\nFix with:\nln -s ../../.agents/skills/example .claude/skills/example',
  ]);
});

test('rejects a copied skill directory', async () => {
  const rootDirectory = await createRepository();
  await mkdir(path.join(rootDirectory, '.claude', 'skills', 'example'));

  assert.equal(
    (await checkAgentSkillLinks(rootDirectory))[0],
    'Claude skill entry is not a symlink: example',
  );
});

test('rejects a link with the wrong target', async () => {
  const rootDirectory = await createRepository();
  await symlink('../example', path.join(rootDirectory, '.claude', 'skills', 'example'));

  assert.match((await checkAgentSkillLinks(rootDirectory))[0], /Incorrect Claude skill link/);
});
