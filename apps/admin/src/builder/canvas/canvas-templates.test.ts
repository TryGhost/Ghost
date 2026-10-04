import { expect, it } from 'vitest';
import { canvasTemplates } from './canvas-templates';

it('binds variations through actual Ghost routing precedence rather than forcing a file', () => {
  const files = {
    'post.hbs': '',
    'page.hbs': '',
    'page-about.hbs': '',
    'custom-wide.hbs': '',
    'custom-unused.hbs': '',
    'partials/custom-fake.hbs': '',
  };
  const content = [
    {
      id: 'about',
      title: 'About',
      url: 'https://example.com/about/',
      slug: 'about',
      customTemplate: 'custom-wide',
    },
    {
      id: 'contact',
      title: 'Contact',
      url: 'https://example.com/contact/',
      slug: 'contact',
      customTemplate: 'custom-wide',
    },
  ];
  const result = canvasTemplates(files, 'page', content);
  expect(result.find((v) => v.path === 'page-about.hbs')?.items.map((i) => i.id)).toEqual([
    'about',
  ]);
  expect(result.find((v) => v.path === 'custom-wide.hbs')?.items.map((i) => i.id)).toEqual([
    'contact',
  ]);
  expect(result.find((v) => v.path === 'custom-unused.hbs')?.items).toEqual([]);
  expect(result.some((v) => v.path.includes('partials/'))).toBe(false);
});

it('resolves Page and taxonomy fallbacks without guessing a slug from the URL', () => {
  const item = { id: 'a', title: 'A', url: 'https://example.com/a/' };
  expect(canvasTemplates({ 'post.hbs': '' }, 'page', [item])[0]).toMatchObject({
    path: 'post.hbs',
    items: [item],
  });
  expect(
    canvasTemplates({ 'index.hbs': '', 'tag-news.hbs': '' }, 'tag', [item]).find(
      (v) => v.path === 'index.hbs',
    )?.items,
  ).toEqual([item]);
});

it('preserves dotted and Unicode template assignments accepted by Ghost', async () => {
  const { canvasPost } = await import('./canvas-posts');
  const item = canvasPost(
    {
      id: 'a',
      title: 'A',
      url: 'https://example.com/a/',
      slug: 'новости',
      custom_template: 'custom-wide.layout',
    },
    'https://example.com/',
  );
  expect(item.customTemplate).toBe('custom-wide.layout');
  expect(
    canvasTemplates({ 'post.hbs': '', 'custom-wide.layout.hbs': '' }, 'post', [item]).find(
      (v) => v.path === 'custom-wide.layout.hbs',
    )?.items,
  ).toEqual([item]);
  expect(
    canvasTemplates({ 'index.hbs': '', 'tag-новости.hbs': '' }, 'tag', [item]).find(
      (v) => v.path === 'tag-новости.hbs',
    )?.items,
  ).toEqual([item]);
});
