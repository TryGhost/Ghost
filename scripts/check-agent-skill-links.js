import { lstat, readdir, readlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkAgentSkillLinks(rootDirectory) {
  const agentsDirectory = path.join(rootDirectory, '.agents', 'skills');
  const claudeDirectory = path.join(rootDirectory, '.claude', 'skills');
  const errors = [];
  const entries = await readdir(agentsDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const name = entry.name;
    const skillFile = path.join(agentsDirectory, name, 'SKILL.md');
    const claudeLink = path.join(claudeDirectory, name);
    const expectedTarget = `../../.agents/skills/${name}`;

    try {
      const skillFileStats = await stat(skillFile);
      if (!skillFileStats.isFile()) {
        errors.push(`${path.relative(rootDirectory, skillFile)} is not a file`);
        continue;
      }
    } catch {
      errors.push(`${path.relative(rootDirectory, skillFile)} is missing`);
      continue;
    }

    let linkStats;
    try {
      linkStats = await lstat(claudeLink);
    } catch {
      errors.push(
        [
          `Missing Claude skill link: ${name}`,
          'Fix with:',
          `ln -s ${expectedTarget} .claude/skills/${name}`,
        ].join('\n'),
      );
      continue;
    }

    if (!linkStats.isSymbolicLink()) {
      errors.push(`Claude skill entry is not a symlink: ${name}`);
      continue;
    }

    const actualTarget = await readlink(claudeLink);

    if (actualTarget !== expectedTarget) {
      errors.push(
        [
          `Incorrect Claude skill link: ${name}`,
          `Expected: ${expectedTarget}`,
          `Actual:   ${actualTarget}`,
        ].join('\n'),
      );
      continue;
    }

    try {
      const linkedSkillStats = await stat(path.join(claudeLink, 'SKILL.md'));
      if (!linkedSkillStats.isFile()) {
        errors.push(`Claude skill link does not resolve to a SKILL.md: ${name}`);
      }
    } catch {
      errors.push(`Claude skill link does not resolve to a SKILL.md: ${name}`);
    }
  }

  return errors;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const errors = await checkAgentSkillLinks(process.cwd());

  if (errors.length > 0) {
    console.error(`Agent skill discovery check failed:\n\n${errors.join('\n\n')}`);
    process.exitCode = 1;
  } else {
    console.log('All repository agent skills are discoverable by Claude.');
  }
}
