import type { APIRequestContext } from '@playwright/test';

/**
 * Arrange-only plumbing over the Admin API.
 *
 * Nothing here asserts anything. Every function either puts the site into a
 * known state, or resolves an identifier the smoke test needs in order to
 * navigate or to name a column. Outcomes are read off the screen, in the spec.
 */

async function json<T>(promise: Promise<import('@playwright/test').APIResponse>): Promise<T> {
  const response = await promise;
  if (!response.ok()) {
    throw new Error(`${response.url()} -> ${response.status()}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function getLabs(api: APIRequestContext): Promise<Record<string, boolean>> {
  const body = await json<{ settings: { key: string; value: unknown }[] }>(
    api.get('/ghost/api/admin/settings/'),
  );
  const raw = body.settings.find((setting) => setting.key === 'labs')?.value;
  return raw ? (JSON.parse(raw as string) as Record<string, boolean>) : {};
}

/**
 * Read-modify-write of the labs blob. Every other writer in this run is this
 * script, so the whole-blob write cannot clobber a concurrent one.
 */
export async function setLabs(
  api: APIRequestContext,
  flags: Record<string, boolean>,
): Promise<void> {
  const current = await getLabs(api);
  const next = { ...current, ...flags };
  await json(
    api.put('/ghost/api/admin/settings/', {
      data: { settings: [{ key: 'labs', value: JSON.stringify(next) }] },
    }),
  );
}

export async function createMember(
  api: APIRequestContext,
  member: { name: string; email: string; labels?: string[] },
): Promise<{ id: string; name: string; email: string }> {
  const body = await json<{ members: { id: string; name: string; email: string }[] }>(
    api.post('/ghost/api/admin/members/', { data: { members: [member] } }),
  );
  return body.members[0];
}

/** Navigation only: the id behind an email, so a screen can be opened directly. */
export async function memberIdByEmail(
  api: APIRequestContext,
  email: string,
): Promise<string | undefined> {
  const body = await json<{ members: { id: string }[] }>(
    api.get(`/ghost/api/admin/members/?filter=${encodeURIComponent(`email:'${email}'`)}`),
  );
  return body.members[0]?.id;
}

/**
 * The key a field was minted with.
 *
 * An identifier, not an outcome: export and import columns are named
 * `metafields.custom.<key>`, and the key is only ever handed out by the API —
 * no screen shows it. Nothing here says whether the key is right.
 */
export async function customFieldKey(api: APIRequestContext, fieldName: string): Promise<string> {
  const body = await json<{ members_metafields: { key: string; name: string }[] }>(
    api.get(
      '/ghost/api/admin/members/metafields/custom/?filter=' +
        encodeURIComponent('status:[active,archived]'),
    ),
  );
  const field = body.members_metafields.find((entry) => entry.name === fieldName);
  if (!field) {
    throw new Error(
      `No custom field named "${fieldName}" (have: ${body.members_metafields.map((entry) => entry.name).join(', ')})`,
    );
  }
  return field.key;
}

export async function setMemberCustomFieldValues(
  api: APIRequestContext,
  id: string,
  values: Record<string, unknown>,
): Promise<void> {
  await json(
    api.put(`/ghost/api/admin/members/${id}/`, {
      data: { members: [{ metafields: { custom: values } }] },
    }),
  );
}

/** The signin (magic) URL Admin hands out for impersonating a member. */
export async function memberSigninUrl(api: APIRequestContext, id: string): Promise<string> {
  const body = await json<{ member_signin_urls: { url: string }[] }>(
    api.get(`/ghost/api/admin/members/${id}/signin_urls/`),
  );
  return body.member_signin_urls[0].url;
}

export async function createPaidTier(
  api: APIRequestContext,
  tier: { name: string; monthlyPrice: number; yearlyPrice: number },
): Promise<{ id: string; name: string; slug: string }> {
  const body = await json<{ tiers: { id: string; name: string; slug: string }[] }>(
    api.post('/ghost/api/admin/tiers/', {
      data: {
        tiers: [
          {
            name: tier.name,
            description: 'Smoke tier',
            type: 'paid',
            visibility: 'public',
            currency: 'usd',
            monthly_price: tier.monthlyPrice,
            yearly_price: tier.yearlyPrice,
            welcome_page_url: null,
            trial_days: 0,
          },
        ],
      },
    }),
  );
  return body.tiers[0];
}

export async function setPortalPlans(api: APIRequestContext, plans: string[]): Promise<void> {
  await json(
    api.put('/ghost/api/admin/settings/', {
      data: { settings: [{ key: 'portal_plans', value: JSON.stringify(plans) }] },
    }),
  );
}

/**
 * Whether this dev site can reach Stripe at all. An environment probe: the
 * Stripe steps skip cleanly when the answer is no.
 */
export async function isStripeConnected(api: APIRequestContext): Promise<boolean> {
  const body = await json<{ settings: { key: string; value: unknown }[] }>(
    api.get('/ghost/api/admin/settings/'),
  );
  const read = (key: string) => body.settings.find((setting) => setting.key === key)?.value;
  return Boolean(read('stripe_connect_account_id') || read('stripe_publishable_key'));
}
