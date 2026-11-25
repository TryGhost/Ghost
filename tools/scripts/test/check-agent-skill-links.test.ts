import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { checkAgentSkillLinks } from '../ci/check-agent-skill-links.ts';

const temporaryDirectories: string[] = [];

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

test('accepts a skill linked into .agents/skills from elsewhere', async () => {
  const rootDirectory = await createRepository();
  await mkdir(path.join(rootDirectory, 'packages', 'ui', 'skills', 'shipped'), { recursive: true });
  await writeFile(
    path.join(rootDirectory, 'packages', 'ui', 'skills', 'shipped', 'SKILL.md'),
    '---\nname: shipped\n---\n',
  );
  await symlink(
    '../../packages/ui/skills/shipped',
    path.join(rootDirectory, '.agents', 'skills', 'shipped'),
  );
  for (const name of ['example', 'shipped']) {
    await symlink(
      `../../.agents/skills/${name}`,
      path.join(rootDirectory, '.claude', 'skills', name),
    );
  }

  assert.deepEqual(await checkAgentSkillLinks(rootDirectory), []);
});

test('reports a skill link whose target is missing', async () => {
  const rootDirectory = await createRepository();
  await symlink('../../missing', path.join(rootDirectory, '.agents', 'skills', 'broken'));

  assert.ok(
    (await checkAgentSkillLinks(rootDirectory)).includes(
      '.agents/skills/broken links to ../../missing, which is missing',
    ),
  );
});

test('reports a skill link that targets a file', async () => {
  const rootDirectory = await createRepository();
  await writeFile(path.join(rootDirectory, 'notes.md'), '');
  await symlink('../../notes.md', path.join(rootDirectory, '.agents', 'skills', 'notes'));

  assert.ok(
    (await checkAgentSkillLinks(rootDirectory)).includes(
      '.agents/skills/notes links to ../../notes.md, which is not a directory',
    ),
  );
});

test('rejects a link with the wrong target', async () => {
  const rootDirectory = await createRepository();
  await symlink('../example', path.join(rootDirectory, '.claude', 'skills', 'example'));

  assert.match((await checkAgentSkillLinks(rootDirectory))[0] ?? '', /Incorrect Claude skill link/);
});
