import { describe, expect, it } from 'vitest';
import {
  fakeAdminEndpoint,
  fakeMemberCustomFields,
  fakeSettingsScreens,
  fakeTags,
  fakeTiers,
  memberCustomField,
  renderSettingsScreen,
  tag,
  tier,
} from '@test-utils/acceptance';
import { configureAdminScenario } from '@test-utils/acceptance/boot';
import { verifyNoUnhandledRequests, withScreenDefaults } from '@test-utils/acceptance/worker';

async function request(path: string, method = 'GET', body?: object) {
  return await fetch(`/ghost/api/admin${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

describe('screen defaults', () => {
  it('preserves explicit data registered before the defaults and captures its requests', async () => {
    const supporter = tier({ name: 'Supporter' });
    const tiers = fakeTiers([supporter]);
    withScreenDefaults(fakeSettingsScreens);
    const response = await request('/tiers/');
    expect(await response.json()).toMatchObject({ tiers: [{ name: 'Supporter' }] });
    expect(tiers.requests).toHaveLength(1);
  });

  it('keeps explicit failure and recovery ordering, regardless of when defaults register', async () => {
    fakeAdminEndpoint('GET', '/tiers/', { errors: [{ message: 'Not yet' }] }, { status: 400 });
    withScreenDefaults(fakeSettingsScreens);
    expect((await request('/tiers/')).status).toBe(400);
    fakeTiers([tier({ name: 'Recovered' })]);
    const response = await request('/tiers/');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ tiers: [{ name: 'Recovered' }] });
  });

  it('reads the current user after the scenario is composed', async () => {
    withScreenDefaults(fakeSettingsScreens);
    configureAdminScenario({ user: { id: 'editor', roles: ['Editor'] } });
    expect(await (await request('/users/')).json()).toMatchObject({
      users: [{ id: 'editor', roles: [{ name: 'Editor' }] }],
    });
  });

  it('does not silently enable settings saves when rendering a settings screen', async () => {
    await renderSettingsScreen();
    expect(
      (await request('/settings/', 'PUT', { settings: [{ key: 'title', value: 'Unexpected' }] }))
        .status,
    ).toBe(418);
    expect(() => verifyNoUnhandledRequests()).toThrow('PUT /settings/');
  });
});

describe('tag resource state', () => {
  it('uses current identity for reads after a rename and does not change the seed', async () => {
    const news = tag({ id: 'news-id', slug: 'news', name: 'News' });
    const operations = { read: true, update: true };
    const tags = fakeTags([news], operations);
    expect(await (await request('/tags/slug/news/')).json()).toMatchObject({
      tags: [{ name: 'News' }],
    });
    const body = { tags: [{ id: 'cannot-change-id', name: 'Latest', slug: 'latest' }] };
    expect((await request('/tags/news-id/', 'PUT', body)).status).toBe(200);
    expect(await (await request('/tags/news-id/')).json()).toMatchObject({
      tags: [{ id: 'news-id', name: 'Latest', slug: 'latest' }],
    });
    expect(await (await request('/tags/slug/latest/')).json()).toMatchObject({
      tags: [{ id: 'news-id', name: 'Latest' }],
    });
    expect((await request('/tags/slug/news/')).status).toBe(404);
    expect(await (await request('/tags/')).json()).toMatchObject({ tags: [{ name: 'Latest' }] });
    expect(tags.update?.lastRequest?.body).toEqual(body);
    expect(tags.read?.requests).toHaveLength(4);
    expect(tags.requests).toHaveLength(1);
    expect(news).toMatchObject({ id: 'news-id', name: 'News', slug: 'news' });
  });

  it('leaves state unchanged when a later explicit handler rejects a write', async () => {
    const news = tag({ id: 'news-id', name: 'News' });
    const tags = fakeTags([news], { read: true, update: true });
    const failed = fakeAdminEndpoint(
      'PUT',
      '/tags/news-id/',
      { errors: [{ message: 'Rejected' }] },
      { status: 422 },
    );
    expect((await request('/tags/news-id/', 'PUT', { tags: [{ name: 'Wrong' }] })).status).toBe(
      422,
    );
    expect(await (await request('/tags/news-id/')).json()).toMatchObject({
      tags: [{ name: 'News' }],
    });
    expect(tags.update.requests).toHaveLength(0);
    expect(failed.requests).toHaveLength(1);
  });

  it('does not enable writes for a browse-only declaration', async () => {
    fakeTags([tag({ id: 'news-id' })]);
    expect(
      (await request('/tags/news-id/', 'PUT', { tags: [{ name: 'Unexpected' }] })).status,
    ).toBe(418);
    expect(() => verifyNoUnhandledRequests()).toThrow('PUT /tags/news-id/');
  });

  it('captures a write to a missing tag without adding it to the collection', async () => {
    const tags = fakeTags([], { update: true });
    const body = { tags: [{ name: 'Missing' }] };
    expect((await request('/tags/missing/', 'PUT', body)).status).toBe(404);
    expect(tags.update.lastRequest?.body).toEqual(body);
    expect(await (await request('/tags/')).json()).toMatchObject({ tags: [] });
  });

  it('rejects callback data with automatic mutations', () => {
    // @ts-expect-error Mutable resources require an array, checked at runtime for JS callers too.
    expect(() => fakeTags(() => [], { update: true })).toThrow('declared array');
  });
});

describe('custom-field creation', () => {
  it('appends exactly one declared result, captures the input, and preserves the caller data', async () => {
    const initial = [memberCustomField({ key: 'company', name: 'Company' })];
    const created = memberCustomField({ key: 'newest', name: 'Newest' });
    const fields = fakeMemberCustomFields(initial, { create: { response: created } });
    created.name = 'Mutated fixture';
    const body = { members_custom_fields: [{ name: 'Newest', type: 'short_text' }] };
    expect((await request('/members/custom_fields/', 'POST', body)).status).toBe(200);
    expect(await (await request('/members/custom_fields/')).json()).toMatchObject({
      members_custom_fields: [
        { key: 'company', name: 'Company' },
        { key: 'newest', name: 'Newest' },
      ],
    });
    expect(fields.create.lastRequest?.body).toEqual(body);
    expect(initial).toHaveLength(1);
    expect((await request('/members/custom_fields/', 'POST', body)).status).toBe(418);
    expect(() => verifyNoUnhandledRequests()).toThrow('already consumed');
    expect(await (await request('/members/custom_fields/')).json()).toMatchObject({
      meta: { pagination: { total: 2 } },
    });
  });

  it('does not append when the create request is overridden by an error', async () => {
    const fields = fakeMemberCustomFields([], {
      create: { response: memberCustomField({ key: 'newest', name: 'Newest' }) },
    });
    fakeAdminEndpoint(
      'POST',
      '/members/custom_fields/',
      { errors: [{ message: 'Rejected' }] },
      { status: 422 },
    );
    expect(
      (
        await request('/members/custom_fields/', 'POST', {
          members_custom_fields: [{ name: 'Newest', type: 'short_text' }],
        })
      ).status,
    ).toBe(422);
    expect(await (await request('/members/custom_fields/')).json()).toMatchObject({
      members_custom_fields: [],
    });
    expect(fields.create.requests).toHaveLength(0);
  });
});
