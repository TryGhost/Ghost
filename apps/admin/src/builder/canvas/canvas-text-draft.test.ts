import { expect, it } from 'vitest';
import { getThemeLiteralTextTargets } from '@tryghost/theme-renderer/editor';
import { resolveCanvasTextDraft } from './canvas-text-draft';
import type { CanvasTextDraft } from './canvas-text-draft';

const draft: CanvasTextDraft = {
  frameId: 'home-mobile',
  kind: 'expanded',
  baseRevision: 'original',
  marker: 'index.hbs:1:1',
  tagName: 'h1',
  baseText: 'Original & text',
  newText: 'Typed text',
  sourceFile: '<h1>Original &amp; text</h1>',
  detached: true,
  conflict: false,
};

it('resumes the uniquely unchanged authored literal after nearby source shifts', () => {
  const files = { 'index.hbs': '<p>Agent addition</p>\n<h1>Original &amp; text</h1>' };
  expect(resolveCanvasTextDraft(draft, files, getThemeLiteralTextTargets(files))).toBe(
    'index.hbs:2:1',
  );
  expect(draft.newText).toBe('Typed text');
});

it('keeps changed, deleted, dynamic or ambiguous source in explicit recovery', () => {
  for (const source of [
    '<h1>Agent text</h1>',
    '<h1>{{title}}</h1>',
    '<!--<h1>Original &amp; text</h1>-->',
    '<h1>Original &amp; text</h1><h1>Original &amp; text</h1>',
  ]) {
    const files = { 'index.hbs': source };
    expect(resolveCanvasTextDraft(draft, files, getThemeLiteralTextTargets(files))).toBeNull();
  }
  expect(resolveCanvasTextDraft(draft, {}, {})).toBeNull();
});
