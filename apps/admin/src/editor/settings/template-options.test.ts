import { describe, expect, it } from 'vitest';
import type { Theme, ThemeTemplate } from '@tryghost/admin-x-framework/api/themes';
import {
  DEFAULT_TEMPLATE_VALUE,
  activeThemeTemplates,
  selectedTemplate,
  slugTemplate,
  templateOptions,
} from './template-options';

const CUSTOM: ThemeTemplate = {
  filename: 'custom-full-feature',
  name: 'Full Feature',
  for: ['page', 'post'],
  slug: null,
};
const CUSTOM_EARLIER: ThemeTemplate = {
  filename: 'custom-brief',
  name: 'Brief',
  for: ['page', 'post'],
  slug: null,
};
const POST_SLUG: ThemeTemplate = {
  filename: 'post-welcome',
  name: 'Welcome',
  for: ['post'],
  slug: 'welcome',
};
const PAGE_SLUG: ThemeTemplate = {
  filename: 'page-welcome',
  name: 'Welcome',
  for: ['page'],
  slug: 'welcome',
};

function theme(overrides: Partial<Theme>): Theme {
  return { active: false, name: 'casper', package: {}, ...overrides };
}

describe('template options', () => {
  describe('activeThemeTemplates', () => {
    it('reads the active theme’s templates', () => {
      const themes = [
        theme({ name: 'casper', templates: [POST_SLUG] }),
        theme({ name: 'edition', active: true, templates: [CUSTOM] }),
      ];

      expect(activeThemeTemplates(themes)).toEqual([CUSTOM]);
    });

    it('has no templates without an active theme, or before the browse lands', () => {
      expect(activeThemeTemplates([theme({ templates: [CUSTOM] })])).toEqual([]);
      expect(activeThemeTemplates([theme({ active: true })])).toEqual([]);
      expect(activeThemeTemplates(undefined)).toEqual([]);
    });
  });

  describe('templateOptions', () => {
    it('offers the slugless templates by name', () => {
      expect(
        templateOptions([CUSTOM, POST_SLUG, CUSTOM_EARLIER]).map((option) => option.filename),
      ).toEqual([CUSTOM_EARLIER.filename, CUSTOM.filename]);
    });

    it('offers nothing when the theme has only slug templates', () => {
      expect(templateOptions([POST_SLUG, PAGE_SLUG])).toEqual([]);
    });
  });

  describe('slugTemplate', () => {
    it('matches the post’s slug for its own content type', () => {
      expect(slugTemplate([POST_SLUG, PAGE_SLUG], 'post', 'welcome')).toBe(POST_SLUG);
      expect(slugTemplate([POST_SLUG, PAGE_SLUG], 'page', 'welcome')).toBe(PAGE_SLUG);
    });

    it('matches nothing for another slug, or before the post has one', () => {
      expect(slugTemplate([POST_SLUG], 'post', 'goodbye')).toBeUndefined();
      expect(slugTemplate([POST_SLUG], 'post', '')).toBeUndefined();
    });

    it('ignores the slugless templates', () => {
      expect(slugTemplate([CUSTOM], 'post', 'custom-full-feature')).toBeUndefined();
    });
  });

  describe('selectedTemplate', () => {
    it('shows the post’s template', () => {
      expect(selectedTemplate([CUSTOM], CUSTOM.filename)).toBe(CUSTOM.filename);
    });

    it('falls back to the default for no template, or one the theme dropped', () => {
      expect(selectedTemplate([CUSTOM], null)).toBe(DEFAULT_TEMPLATE_VALUE);
      expect(selectedTemplate([CUSTOM], 'custom-gone')).toBe(DEFAULT_TEMPLATE_VALUE);
    });
  });
});
