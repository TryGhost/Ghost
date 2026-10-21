/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDocs } from '../../../scripts/build-docs';

/**
 * The skills in `skills/` ship in the package and link into the generated
 * `docs/`, which is gitignored. These tests resolve every skill link against
 * the published layout, building the docs in memory, so a broken link fails
 * here without a prior `pnpm build`.
 *
 * The entry skills in `entry-skill/` don't ship: they're installed from GitHub
 * and name files inside `node_modules/@tryghost/shade/`, which must exist in
 * the published layout.
 */

const packageRoot = join(import.meta.dirname, '../../..');
const folders = (dir: string): string[] =>
  readdirSync(join(packageRoot, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
const skillNames = folders('skills');
const entrySkillNames = folders('entry-skill');

/** Markdown files in the published layout, keyed by package-relative path. */
function publishedMarkdown(): Map<string, string> {
  const files = new Map<string, string>();
  for (const doc of buildDocs(packageRoot).docs) {
    files.set(`docs/${doc.output}`, doc.markdown);
  }
  files.set('docs/index.md', '');
  files.set('README.md', readFileSync(join(packageRoot, 'README.md'), 'utf8'));
  for (const name of skillNames) {
    files.set(
      `skills/${name}/SKILL.md`,
      readFileSync(join(packageRoot, 'skills', name, 'SKILL.md'), 'utf8'),
    );
  }
  return files;
}

/** GitHub-style heading anchors, outside fenced code. */
function anchors(markdown: string): Set<string> {
  const found = new Set<string>();
  const counts = new Map<string, number>();
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    const heading = !inFence && /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading) {
      continue;
    }
    const slug = heading[1]!
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*_]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-');
    const seen = counts.get(slug) ?? 0;
    counts.set(slug, seen + 1);
    found.add(seen === 0 ? slug : `${slug}-${seen}`);
  }
  return found;
}

const linksIn = (markdown: string): string[] =>
  [...markdown.matchAll(/\]\(([^()\s]+)\)/g)].map((match) => match[1]!);

describe('shipped skills', () => {
  const files = publishedMarkdown();
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
    files: string[];
  };

  it('ships the skills folder', () => {
    expect(skillNames.length).toBeGreaterThan(0);
    expect(packageJson.files).toEqual(expect.arrayContaining(['docs', 'skills']));
  });

  it.each(skillNames)('%s is named after its folder and has a one-line description', (name) => {
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(files.get(`skills/${name}/SKILL.md`)!);
    expect(frontmatter?.[1]).toMatch(new RegExp(`^name: ${name}$`, 'm'));
    expect(frontmatter?.[1]).toMatch(/^description: \S.*$/m);
  });

  it.each(skillNames)('%s links resolve inside the published package', (name) => {
    const from = `skills/${name}/SKILL.md`;
    const broken: string[] = [];
    for (const url of linksIn(files.get(from)!)) {
      if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
        continue;
      }
      const [path = '', anchor] = url.split('#');
      const target = path ? posix.normalize(posix.join(posix.dirname(from), path)) : from;
      const markdown = files.get(target);
      if (target.startsWith('..') || markdown === undefined) {
        broken.push(`${url}: no file at ${target} in the package`);
      } else if (anchor && !anchors(markdown).has(anchor)) {
        broken.push(`${url}: ${target} has no heading for #${anchor}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('entry skills', () => {
  const files = publishedMarkdown();
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
    files: string[];
  };
  const read = (name: string): string =>
    readFileSync(join(packageRoot, 'entry-skill', name, 'SKILL.md'), 'utf8');

  it('are not shipped in the package', () => {
    expect(entrySkillNames.length).toBeGreaterThan(0);
    expect(packageJson.files.filter((file) => file.startsWith('entry-skill'))).toEqual([]);
  });

  it.each(entrySkillNames)(
    '%s is named after its folder and has a one-line description',
    (name) => {
      const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(read(name));
      expect(frontmatter?.[1]).toMatch(new RegExp(`^name: ${name}$`, 'm'));
      expect(frontmatter?.[1]).toMatch(/^description: \S.*$/m);
    },
  );

  it.each(entrySkillNames)('%s names only files the published package has', (name) => {
    const paths = [...read(name).matchAll(/node_modules\/@tryghost\/shade\/([^\s`)]*)/g)].map(
      (match) => match[1]!,
    );
    expect(paths.length).toBeGreaterThan(0);
    const missing = paths.filter((path) => {
      const target = path.replace(/\/$/, '');
      return (
        target !== '' &&
        target !== 'package.json' &&
        !files.has(target) &&
        ![...files.keys()].some((file) => file.startsWith(`${target}/`))
      );
    });
    expect(missing).toEqual([]);
  });
});
