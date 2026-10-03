import { expect, it } from 'vitest';

import { instance, responses } from './fixture';
import { recordedContentResponse } from './recorded-content';
import type { RecordedPosts } from './recorded-content';

it('preserves exact Casper recordings and adapts only recorded first-page Source feed limits', async () => {
  const recordedUrl = Object.keys(responses).find((url) => url.includes('limit=25'))!;
  expect(await recordedContentResponse(recordedUrl).text()).toBe(
    responses[recordedUrl as keyof typeof responses].body,
  );
  const sourceUrl = new URL(recordedUrl);
  sourceUrl.searchParams.set('limit', '16');
  const source = (await recordedContentResponse(sourceUrl.href).json()) as RecordedPosts;
  const original = JSON.parse(
    responses[recordedUrl as keyof typeof responses].body,
  ) as RecordedPosts;
  expect(source.posts).toEqual(original.posts.slice(0, 16));
  expect(source.meta.pagination).toEqual({
    page: 1,
    limit: 16,
    pages: 3,
    total: 34,
    next: 2,
    prev: null,
  });
  sourceUrl.searchParams.set('include', 'authors');
  sourceUrl.searchParams.set('limit', '12');
  sourceUrl.searchParams.delete('page');
  expect(((await recordedContentResponse(sourceUrl.href).json()) as RecordedPosts).posts).toEqual(
    original.posts.slice(0, 12),
  );
});

it('uses recorded related posts for the Source authors include without substituting unknown filters', async () => {
  const relatedUrl = Object.keys(responses).find((url) => url.includes('filter='))!;
  const request = new URL(relatedUrl);
  request.searchParams.set('include', 'authors');
  expect(await recordedContentResponse(request.href).json()).toEqual(
    JSON.parse(responses[relatedUrl as keyof typeof responses].body),
  );
  request.searchParams.set('filter', 'featured:true');
  expect(() => recordedContentResponse(request.href)).toThrow('No recorded');
});

it('rejects unrecorded pages, oversized feeds, foreign sites, keys and query parameters', () => {
  const base = new URL(
    `ghost/api/content/posts/?key=${instance.contentApiKey}&include=authors&limit=12`,
    instance.siteUrl,
  );
  for (const [key, value] of [
    ['page', '2'],
    ['limit', '26'],
    ['key', 'different'],
    ['order', 'title asc'],
    ['include', 'unknown'],
    ['limit', '1.5'],
  ]) {
    const request = new URL(base);
    request.searchParams.set(key, value);
    expect(() => recordedContentResponse(request.href)).toThrow('No recorded');
  }
  base.hostname = 'example.com';
  expect(() => recordedContentResponse(base.href)).toThrow('No recorded');
  base.hostname = 'localhost';
  base.searchParams.append('limit', '12');
  expect(() => recordedContentResponse(base.href)).toThrow('No recorded');
});
