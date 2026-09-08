import { describe, expect, it } from 'vitest';
import {
  xCardDescription,
  xCardImage,
  xCardTitle,
  xDescriptionPlaceholder,
  xPreviewDescription,
  xTitlePlaceholder,
} from './x-card-fields';

const TITLE = { twitterTitle: '', metaTitle: '', title: '' };
const DESCRIPTION = {
  twitterDescription: '',
  customExcerpt: '',
  metaDescription: '',
  postExcerpt: '',
  siteDescription: '',
};
const IMAGE = { twitterImage: '', featureImage: '', siteTwitterImage: '', siteCoverImage: '' };

describe('xCardTitle', () => {
  it('prefers the X title', () => {
    expect(xCardTitle({ twitterTitle: 'On X', metaTitle: 'In search', title: 'The post' })).toBe(
      'On X',
    );
  });

  it('falls back to the meta title, then the post title', () => {
    expect(xCardTitle({ ...TITLE, metaTitle: 'In search', title: 'The post' })).toBe('In search');
    expect(xCardTitle({ ...TITLE, title: 'The post' })).toBe('The post');
  });

  it('names an untitled post', () => {
    expect(xCardTitle(TITLE)).toBe('(Untitled)');
  });
});

describe('xCardDescription', () => {
  it('prefers the X description', () => {
    expect(
      xCardDescription({
        ...DESCRIPTION,
        twitterDescription: 'On X',
        customExcerpt: 'The excerpt',
      }),
    ).toBe('On X');
  });

  it('falls back to the excerpt before the meta description', () => {
    expect(
      xCardDescription({
        ...DESCRIPTION,
        metaDescription: 'In search',
        customExcerpt: 'The excerpt',
      }),
    ).toBe('The excerpt');
    expect(xCardDescription({ ...DESCRIPTION, metaDescription: 'In search' })).toBe('In search');
  });

  it('falls back to the generated excerpt before the site description', () => {
    expect(
      xCardDescription({
        ...DESCRIPTION,
        postExcerpt: 'The excerpt the server made',
        siteDescription: 'A site',
      }),
    ).toBe('The excerpt the server made');
  });

  it('falls back to the site description last', () => {
    expect(xCardDescription({ ...DESCRIPTION, siteDescription: 'A site' })).toBe('A site');
    expect(xCardDescription(DESCRIPTION)).toBe('');
  });
});

describe('xCardImage', () => {
  it('prefers the X image, then the feature image, then the site images', () => {
    expect(
      xCardImage({
        twitterImage: 'x.png',
        featureImage: 'feature.png',
        siteTwitterImage: 'site-x.png',
        siteCoverImage: 'cover.png',
      }),
    ).toBe('x.png');
    expect(
      xCardImage({ ...IMAGE, featureImage: 'feature.png', siteTwitterImage: 'site-x.png' }),
    ).toBe('feature.png');
    expect(xCardImage({ ...IMAGE, siteTwitterImage: 'site-x.png', siteCoverImage: 'c.png' })).toBe(
      'site-x.png',
    );
    expect(xCardImage({ ...IMAGE, siteCoverImage: 'c.png' })).toBe('c.png');
    expect(xCardImage(IMAGE)).toBe('');
  });
});

describe('the lengths the pane truncates to', () => {
  it('truncates the title placeholder at what the card shows, ellipsis included', () => {
    expect(xTitlePlaceholder('a'.repeat(37))).toBe('a'.repeat(37));
    expect(xTitlePlaceholder('a'.repeat(38))).toBe(`${'a'.repeat(37)}...`);
  });

  it('truncates the description placeholder at what the card shows, ellipsis included', () => {
    expect(xDescriptionPlaceholder('a'.repeat(147))).toBe('a'.repeat(147));
    expect(xDescriptionPlaceholder('a'.repeat(148))).toBe(`${'a'.repeat(147)}...`);
  });

  it('cuts the previewed description to 140 characters and leaves the title whole', () => {
    expect(xPreviewDescription('a'.repeat(400))).toBe(`${'a'.repeat(137)}...`);
    expect(xPreviewDescription('a'.repeat(400))).toHaveLength(140);
  });
});
