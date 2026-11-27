import { lstat, readdir, readlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkAgentSkillLinks(rootDirectory: string): Promise<string[]> {
  const agentsDirectory = path.join(rootDirectory, '.agents', 'skills');
  const claudeDirectory = path.join(rootDirectory, '.claude', 'skills');
  const errors: string[] = [];
  const entries = await readdir(agentsDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;

    // A skill can live elsewhere (a package that ships it) and be linked in.
    if (entry.isSymbolicLink()) {
      const linkPath = path.join(agentsDirectory, name);
      try {
        const targetStats = await stat(linkPath);
        if (!targetStats.isDirectory()) {
          errors.push(
            `${path.relative(rootDirectory, linkPath)} links to ${await readlink(linkPath)}, which is not a directory`,
          );
          continue;
        }
      } catch {
        errors.push(
          `${path.relative(rootDirectory, linkPath)} links to ${await readlink(linkPath)}, which is missing`,
        );
        continue;
      }
    } else if (!entry.isDirectory()) {
      continue;
    }

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
    const skills = (
      await readdir(path.join(process.cwd(), '.agents', 'skills'), { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => (entry.isSymbolicLink() ? `${entry.name} (linked)` : entry.name));
    console.log(
      `All ${skills.length} repository agent skills are discoverable by Claude:\n${skills.join('\n')}`,
    );
  }
}
