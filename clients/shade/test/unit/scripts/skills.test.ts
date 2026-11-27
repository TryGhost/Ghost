/// <reference types="node" />
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDocs } from '../../../scripts/build-docs';

/**
 * The skills in `skills/` are installed into apps with `npx skills add`, apart
 * from the package, and link to the docs Storybook serves at
 * `https://shade.ghost.org/docs/<page>.md`. These tests build the docs in memory
 * and check every docs link against the generated pages and their headings.
 */

const packageRoot = join(import.meta.dirname, '../../..');
const DOCS_URL = 'https://shade.ghost.org/docs/';

const skillNames = readdirSync(join(packageRoot, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const skills = new Map(
  skillNames.map((name) => [
    name,
    readFileSync(join(packageRoot, 'skills', name, 'SKILL.md'), 'utf8'),
  ]),
);

const generated = buildDocs(packageRoot).docs;

/** Generated docs keyed by served path, e.g. `components/patterns/page-header.md`. */
const docs = new Map<string, string>(generated.map((doc) => [doc.output, doc.markdown]));
docs.set('index.md', '');

/**
 * Where a served doc's source lives, as the root AGENTS.md tells agents working
 * in the Ghost repo: `docs/<page>.md` is `src/docs/<page>.mdx`, and
 * `docs/components/<path>.md` is `src/components/<path>.mdx`.
 */
const sourceInRepo = (path: string): string =>
  path.startsWith('components/')
    ? `src/${path.replace(/\.md$/, '.mdx')}`
    : `src/docs/${path.replace(/\.md$/, '.mdx')}`;

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

/** Every shade.ghost.org docs URL in the text, in links and code spans alike. */
const docsUrlsIn = (markdown: string): string[] =>
  [...markdown.matchAll(/https:\/\/shade\.ghost\.org\/docs\/[^\s)`>\]]+/g)].map(
    (match) => match[0],
  );

describe('skills', () => {
  it('has skills', () => {
    expect(skillNames.length).toBeGreaterThan(0);
  });

  it.each(skillNames)('%s is named after its folder and has a description', (name) => {
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(skills.get(name)!);
    expect(frontmatter?.[1]).toMatch(new RegExp(`^name: ${name}$`, 'm'));
    expect(frontmatter?.[1]).toMatch(/^description: \S.*$/m);
  });

  it.each(skillNames)('%s has no package-relative docs links or node_modules paths', (name) => {
    const skill = skills.get(name)!;
    expect(skill).not.toMatch(/\.\.\/\.\.\/docs\//);
    expect(skill).not.toMatch(/node_modules/);
  });

  it.each(skillNames)('%s docs links point at generated pages and headings', (name) => {
    const broken: string[] = [];
    for (const url of docsUrlsIn(skills.get(name)!)) {
      const [path = '', anchor] = url.slice(DOCS_URL.length).split('#');
      const markdown = docs.get(path);
      if (markdown === undefined) {
        broken.push(`${url}: the docs build generates no ${path}`);
      } else if (anchor && !anchors(markdown).has(anchor)) {
        broken.push(`${url}: ${path} has no heading for #${anchor}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it.each(skillNames)('%s docs links map to .mdx sources in the repo', (name) => {
    const missing = docsUrlsIn(skills.get(name)!)
      .map((url) => sourceInRepo(url.slice(DOCS_URL.length).split('#')[0]!))
      .filter((source) => !existsSync(join(packageRoot, source)));
    expect(missing).toEqual([]);
  });

  it('maps every generated doc back to its own source', () => {
    expect(generated.length).toBeGreaterThan(0);
    for (const doc of generated) {
      expect(sourceInRepo(doc.output)).toBe(doc.source);
    }
  });

  it.each(skillNames)('%s links to sibling skills that exist', (name) => {
    const siblings = [...skills.get(name)!.matchAll(/\]\(\.\.\/([^/)]+)\/SKILL\.md\)/g)].map(
      (match) => match[1]!,
    );
    expect(siblings.filter((sibling) => !skills.has(sibling))).toEqual([]);
  });
});

/**
 * `dev-skill/` holds an internal skill for Ghost's own team: it runs only when
 * typed, stays out of the npm package, and copies `build-ghost-app/` into the
 * app folder it sets up.
 */
describe('dev skill', () => {
  const devSkillDir = join(packageRoot, 'dev-skill', 'ghost-app-ui-dev-setup');
  const frontmatterOf = (file: string) =>
    /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(join(devSkillDir, file), 'utf8'))?.[1];

  it('is named after its folder and runs only when typed', () => {
    const frontmatter = frontmatterOf('SKILL.md');
    expect(frontmatter).toMatch(/^name: ghost-app-ui-dev-setup$/m);
    expect(frontmatter).toMatch(/^description: \S.*$/m);
    expect(frontmatter).toMatch(/^disable-model-invocation: true$/m);
  });

  it('is not in the npm package', () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
      files: string[];
    };
    expect(manifest.files.some((entry) => entry.replace(/^!/, '').startsWith('dev-skill'))).toBe(
      false,
    );
  });

  it('has a valid build-ghost-app template', () => {
    const frontmatter = frontmatterOf('build-ghost-app/SKILL.md');
    expect(frontmatter).toMatch(/^name: build-ghost-app$/m);
    expect(frontmatter).toMatch(/^description: \S.*$/m);
  });

  it('links to headings that exist in its reference', () => {
    const reference = anchors(readFileSync(join(devSkillDir, 'reference.md'), 'utf8'));
    const links = [
      ...readFileSync(join(devSkillDir, 'SKILL.md'), 'utf8').matchAll(
        /\]\(reference\.md#([^)]+)\)/g,
      ),
    ].map((match) => match[1]!);
    expect(links.length).toBeGreaterThan(0);
    expect(links.filter((anchor) => !reference.has(anchor))).toEqual([]);
  });
});
