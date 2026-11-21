import { describe, expect, it } from 'vitest';
import { type CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import {
  type ThemeVariantPreset,
  findMatchingVariant,
  getThemeVariants,
  resolvePreset,
} from './theme-variants';

const theme = (name: string) => ({ name, active: false, package: { name } }) as Theme;

const settings = (values: Record<string, string | boolean | null>): CustomThemeSetting[] => [
  {
    id: '1',
    key: 'header_style',
    type: 'select',
    options: ['Landing', 'Magazine'],
    default: 'Landing',
    value: (values.header_style as string) ?? 'Landing',
  },
  {
    id: '2',
    key: 'post_feed_style',
    type: 'select',
    options: ['List', 'Grid'],
    default: 'List',
    value: (values.post_feed_style as string) ?? 'List',
  },
  { id: '3', key: 'background', type: 'image', value: (values.background as string) ?? null },
];

describe('theme presets', () => {
  it("offers an official theme's demo and its variants, by the theme's folder name", () => {
    expect(getThemeVariants(theme('source')).map(({ id }) => id)).toEqual([
      'news',
      'magazine',
      'newsletter',
    ]);
    // An edited copy under another name is not the official theme
    expect(getThemeVariants(theme('source-edited'))).toEqual([]);
    expect(getThemeVariants(theme('casper'))).toEqual([]);
    expect(getThemeVariants(undefined)).toEqual([]);
  });

  it('sets what a preset names, the other preset settings to their defaults, and keeps the rest', () => {
    expect(
      resolvePreset(
        settings({ post_feed_style: 'Grid', background: 'x.png' }),
        { header_style: 'Magazine' },
        new Set(['header_style', 'post_feed_style']),
      ),
    ).toEqual({ header_style: 'Magazine', post_feed_style: 'List' });
  });

  it('finds the preset the settings match in all presets are about, and none once they differ', () => {
    const presets: ThemeVariantPreset[] = [
      { id: 'news', label: 'News', settings: {} },
      {
        id: 'magazine',
        label: 'Magazine',
        settings: { header_style: 'Magazine', post_feed_style: 'Grid' },
      },
    ];

    expect(findMatchingVariant(settings({}), presets)?.id).toBe('news');
    expect(
      findMatchingVariant(settings({ header_style: 'Magazine', post_feed_style: 'Grid' }), presets)
        ?.id,
    ).toBe('magazine');
    // Half a preset is neither
    expect(findMatchingVariant(settings({ header_style: 'Magazine' }), presets)).toBeUndefined();
    // Settings no preset is about (an uploaded image) don't stop a match
    expect(findMatchingVariant(settings({ background: 'x.png' }), presets)?.id).toBe('news');
  });

  it('uses the presets a theme declares itself, in place of the official ones', () => {
    const source = theme('source');
    source.package.config = {
      presets: { News: { header_style: 'Landing' }, 'Big Magazine': { header_style: 'Magazine' } },
    };

    expect(getThemeVariants(source)).toEqual([
      { id: 'news', label: 'News', settings: { header_style: 'Landing' } },
      { id: 'big-magazine', label: 'Big Magazine', settings: { header_style: 'Magazine' } },
    ]);
  });

  it("leaves out presets a theme declares in a shape it can't read", () => {
    const custom = theme('custom');
    custom.package.config = {
      presets: { News: 'header_style=Landing' },
    } as unknown as NonNullable<Theme['package']['config']>;

    expect(getThemeVariants(custom)).toEqual([]);
  });

  it("passes over values that don't fit a setting, so a preset can't break activation", () => {
    expect(
      resolvePreset(
        settings({}),
        { header_style: 'Mosaic', post_feed_style: 'Grid' },
        new Set(['header_style', 'post_feed_style']),
      ),
    ).toEqual({ header_style: 'Landing', post_feed_style: 'Grid' });
  });
});
