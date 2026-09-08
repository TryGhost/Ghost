import { describe, expect, it } from 'vitest';
import {
  facebookDescription,
  facebookDescriptionPlaceholder,
  facebookImage,
  facebookPreviewText,
  facebookTitle,
  facebookTitlePlaceholder,
  siteDomain,
} from './facebook-card-fields';

const NO_TITLE = { ogTitle: '', metaTitle: '', title: '' };
const NO_DESCRIPTION = {
  ogDescription: '',
  customExcerpt: '',
  metaDescription: '',
  postExcerpt: '',
  siteDescription: '',
};
const NO_IMAGE = { ogImage: '', featureImage: '', siteOgImage: '', siteCoverImage: '' };

describe('facebookTitle', () => {
  it('prefers the Facebook title, then the meta title, then the post title', () => {
    expect(facebookTitle({ ogTitle: 'Facebook', metaTitle: 'Meta', title: 'Post' })).toBe(
      'Facebook',
    );
    expect(facebookTitle({ ...NO_TITLE, metaTitle: 'Meta', title: 'Post' })).toBe('Meta');
    expect(facebookTitle({ ...NO_TITLE, title: 'Post' })).toBe('Post');
  });

  it('falls back to the untitled placeholder', () => {
    expect(facebookTitle(NO_TITLE)).toBe('(Untitled)');
  });
});

describe('facebookDescription', () => {
  it('prefers the Facebook description, then the excerpt, then the meta description', () => {
    expect(
      facebookDescription({
        ogDescription: 'Facebook',
        customExcerpt: 'Excerpt',
        metaDescription: 'Meta',
        postExcerpt: 'Generated',
        siteDescription: 'Site',
      }),
    ).toBe('Facebook');
    expect(
      facebookDescription({
        ...NO_DESCRIPTION,
        customExcerpt: 'Excerpt',
        metaDescription: 'Meta',
        postExcerpt: 'Generated',
      }),
    ).toBe('Excerpt');
    expect(
      facebookDescription({ ...NO_DESCRIPTION, metaDescription: 'Meta', postExcerpt: 'Generated' }),
    ).toBe('Meta');
  });

  it('falls back to the generated excerpt, then the site description, then nothing', () => {
    expect(
      facebookDescription({
        ...NO_DESCRIPTION,
        postExcerpt: 'Generated',
        siteDescription: 'Site',
      }),
    ).toBe('Generated');
    expect(facebookDescription({ ...NO_DESCRIPTION, siteDescription: 'Site' })).toBe('Site');
    expect(facebookDescription(NO_DESCRIPTION)).toBe('');
  });
});

describe('facebookImage', () => {
  it('prefers the Facebook image, then the feature image, then the site images', () => {
    expect(
      facebookImage({
        ogImage: 'og.png',
        featureImage: 'feature.png',
        siteOgImage: 'site-og.png',
        siteCoverImage: 'cover.png',
      }),
    ).toBe('og.png');
    expect(
      facebookImage({ ...NO_IMAGE, featureImage: 'feature.png', siteOgImage: 'site-og.png' }),
    ).toBe('feature.png');
    expect(
      facebookImage({ ...NO_IMAGE, siteOgImage: 'site-og.png', siteCoverImage: 'c.png' }),
    ).toBe('site-og.png');
    expect(facebookImage({ ...NO_IMAGE, siteCoverImage: 'c.png' })).toBe('c.png');
    expect(facebookImage(NO_IMAGE)).toBe('');
  });
});

describe('the lengths the pane truncates to', () => {
  const long = 'a'.repeat(400);

  it('cuts the title placeholder to 40 characters, ellipsis included', () => {
    expect(facebookTitlePlaceholder(long)).toBe(`${'a'.repeat(37)}...`);
    expect(facebookTitlePlaceholder(long)).toHaveLength(40);
  });

  it('cuts the description placeholder to 150 characters', () => {
    expect(facebookDescriptionPlaceholder(long)).toBe(`${'a'.repeat(147)}...`);
    expect(facebookDescriptionPlaceholder(long)).toHaveLength(150);
  });

  it('cuts the preview to 140 characters, shorter than either placeholder', () => {
    expect(facebookPreviewText(long)).toBe(`${'a'.repeat(137)}...`);
    expect(facebookPreviewText(long)).toHaveLength(140);
  });
});

describe('siteDomain', () => {
  it('drops the scheme and the trailing slash', () => {
    expect(siteDomain('https://example.com/')).toBe('example.com');
    expect(siteDomain('http://example.com/blog/')).toBe('example.com/blog');
  });
});
