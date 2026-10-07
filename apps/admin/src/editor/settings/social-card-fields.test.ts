import { describe, expect, it } from 'vitest';
import { truncate } from './meta-data-fields';
import {
  SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH,
  SOCIAL_PREVIEW_LENGTH,
  SOCIAL_TITLE_PLACEHOLDER_LENGTH,
  siteDomain,
  socialDescription,
  socialImage,
  socialTitle,
} from './social-card-fields';

const NO_TITLE = { own: '', metaTitle: '', title: '' };
const NO_DESCRIPTION = {
  own: '',
  customExcerpt: '',
  metaDescription: '',
  postExcerpt: '',
  siteDescription: '',
};
const NO_IMAGE = { own: '', featureImage: '', siteSocialImage: '', siteCoverImage: '' };

describe('socialTitle', () => {
  it('prefers the card’s own title, then the meta title, then the post title', () => {
    expect(socialTitle({ own: 'On the card', metaTitle: 'Meta', title: 'Post' })).toBe(
      'On the card',
    );
    expect(socialTitle({ ...NO_TITLE, metaTitle: 'Meta', title: 'Post' })).toBe('Meta');
    expect(socialTitle({ ...NO_TITLE, title: 'Post' })).toBe('Post');
  });

  it('falls back to the untitled placeholder', () => {
    expect(socialTitle(NO_TITLE)).toBe('(Untitled)');
  });
});

describe('socialDescription', () => {
  it('prefers the card’s own description, then the excerpt, then the meta description', () => {
    expect(
      socialDescription({
        own: 'On the card',
        customExcerpt: 'Excerpt',
        metaDescription: 'Meta',
        postExcerpt: 'Generated',
        siteDescription: 'Site',
      }),
    ).toBe('On the card');
    expect(
      socialDescription({
        ...NO_DESCRIPTION,
        customExcerpt: 'Excerpt',
        metaDescription: 'Meta',
        postExcerpt: 'Generated',
      }),
    ).toBe('Excerpt');
    expect(
      socialDescription({ ...NO_DESCRIPTION, metaDescription: 'Meta', postExcerpt: 'Generated' }),
    ).toBe('Meta');
  });

  it('falls back to the generated excerpt, then the site description, then nothing', () => {
    expect(
      socialDescription({
        ...NO_DESCRIPTION,
        postExcerpt: 'Generated',
        siteDescription: 'Site',
      }),
    ).toBe('Generated');
    expect(socialDescription({ ...NO_DESCRIPTION, siteDescription: 'Site' })).toBe('Site');
    expect(socialDescription(NO_DESCRIPTION)).toBe('');
  });
});

describe('socialImage', () => {
  it('prefers the card’s own image, then the feature image, then the site images', () => {
    expect(
      socialImage({
        own: 'card.png',
        featureImage: 'feature.png',
        siteSocialImage: 'site-social.png',
        siteCoverImage: 'cover.png',
      }),
    ).toBe('card.png');
    expect(
      socialImage({ ...NO_IMAGE, featureImage: 'feature.png', siteSocialImage: 'site-social.png' }),
    ).toBe('feature.png');
    expect(
      socialImage({ ...NO_IMAGE, siteSocialImage: 'site-social.png', siteCoverImage: 'c.png' }),
    ).toBe('site-social.png');
    expect(socialImage({ ...NO_IMAGE, siteCoverImage: 'c.png' })).toBe('c.png');
    expect(socialImage(NO_IMAGE)).toBe('');
  });
});

describe('the lengths a card pane truncates to', () => {
  const long = 'a'.repeat(400);

  it('cuts the title placeholder to 40 characters, ellipsis included', () => {
    expect(truncate(long, SOCIAL_TITLE_PLACEHOLDER_LENGTH)).toBe(`${'a'.repeat(37)}...`);
    expect(truncate(long, SOCIAL_TITLE_PLACEHOLDER_LENGTH)).toHaveLength(40);
    expect(truncate('a'.repeat(37), SOCIAL_TITLE_PLACEHOLDER_LENGTH)).toBe('a'.repeat(37));
    expect(truncate('a'.repeat(38), SOCIAL_TITLE_PLACEHOLDER_LENGTH)).toBe(`${'a'.repeat(37)}...`);
  });

  it('cuts the description placeholder to 150 characters', () => {
    expect(truncate(long, SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)).toBe(`${'a'.repeat(147)}...`);
    expect(truncate(long, SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)).toHaveLength(150);
    expect(truncate('a'.repeat(147), SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)).toBe('a'.repeat(147));
    expect(truncate('a'.repeat(148), SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH)).toBe(
      `${'a'.repeat(147)}...`,
    );
  });

  it('cuts the preview to 140 characters, shorter than either placeholder', () => {
    expect(truncate(long, SOCIAL_PREVIEW_LENGTH)).toBe(`${'a'.repeat(137)}...`);
    expect(truncate(long, SOCIAL_PREVIEW_LENGTH)).toHaveLength(140);
  });
});

describe('siteDomain', () => {
  it('drops the scheme and the trailing slash', () => {
    expect(siteDomain('https://example.com/')).toBe('example.com');
    expect(siteDomain('http://example.com/blog/')).toBe('example.com/blog');
  });
});
