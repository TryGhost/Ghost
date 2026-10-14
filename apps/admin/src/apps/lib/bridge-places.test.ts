import { describe, expect, it } from 'vitest';
import { placeRoute } from './bridge-places';

const id = '6500000000000000000000a1';

describe('placeRoute', () => {
  it('routes each place an app can name to where it lives in Admin', () => {
    expect(placeRoute({ post: { id } })).toBe(`/editor/post/${id}`);
    expect(placeRoute({ page: { id } })).toBe(`/editor/page/${id}`);
    expect(placeRoute({ member: { id } })).toBe(`/members/${id}`);
    expect(placeRoute({ apps: true })).toBe('/apps');
  });
});
