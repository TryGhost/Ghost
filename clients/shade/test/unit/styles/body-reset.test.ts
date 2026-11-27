/**
 * @vitest-environment node
 */
/// <reference types="node" />
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/postcss';
import postcss, { type Root, type Rule } from 'postcss';
import { beforeAll, describe, expect, it } from 'vitest';

const SHADE_DIR = resolve(import.meta.dirname, '../../..');
// What `@tryghost/shade/styles.css` resolves to for an app
const PUBLISHED_STYLES = resolve(SHADE_DIR, 'styles-published.css');

let css: Root;

function rulesFor(selector: string): Rule[] {
  const rules: Rule[] = [];
  css.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rules.push(rule);
    }
  });
  return rules;
}

function declaresMargin(rule: Rule): boolean {
  return rule.nodes.some((node) => node.type === 'decl' && node.prop === 'margin');
}

// Compiles the stylesheet as an app's production build does, with nesting flattened.
beforeAll(async () => {
  const source = await readFile(PUBLISHED_STYLES, 'utf8');
  const result = await postcss([
    tailwindcss({ base: SHADE_DIR, optimize: { minify: false } }),
  ]).process(source, { from: PUBLISHED_STYLES });
  css = result.root;
}, 30_000);

describe("Shade's body reset", () => {
  it('removes the body margin in a rule that matches body', () => {
    const margins = rulesFor('body').flatMap((rule) =>
      rule.nodes.filter((node) => node.type === 'decl' && node.prop === 'margin'),
    );

    expect(margins.map((decl) => decl.type === 'decl' && decl.value)).toEqual(['0']);
  });

  it('applies at every size, from the base layer an app can override', () => {
    const rule = rulesFor('body').find(declaresMargin);
    const layer = rule?.parent;

    expect(layer?.type === 'atrule' && `@${layer.name} ${layer.params}`).toBe('@layer base');
    expect(layer?.parent?.type).toBe('root');
  });

  it('leaves no body rule scoped to .shade, which sits inside body', () => {
    expect(rulesFor(':where(.shade) body').map((rule) => rule.selector)).toEqual([]);
  });
});
