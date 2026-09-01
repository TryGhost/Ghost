import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  fakeMemberCustomFields,
  fakeMembers,
  label,
  member,
  renderAdminApp,
  tier,
} from '@test-utils/acceptance';
import { membersScreen } from './members.screen';

describe('Members list', () => {
  it('lists members', async () => {
    fakeMembers([
      member({ name: 'First Member' }),
      member({ name: 'Second Member' }),
      member({ name: 'Third Member' }),
    ]);
    await renderAdminApp('/members');

    await expect(membersScreen.memberRows()).toHaveCount(3);
    await expect.element(membersScreen.link('First Member')).toBeVisible();
    await expect.element(membersScreen.link('Second Member')).toBeVisible();
    await expect.element(membersScreen.link('Third Member')).toBeVisible();
  });

  it('filters members by label from the URL', async () => {
    const vip = label({ name: 'VIP' });
    const membersApi = fakeMembers([
      member({ name: 'Labelled One', labels: [vip] }),
      member({ name: 'Labelled Two', labels: [vip] }),
    ]);
    await renderAdminApp('/members?filter=label:VIP');

    await expect.element(membersScreen.link('Labelled One')).toBeVisible();
    await expect(membersScreen.memberRows()).toHaveCount(2);

    // The URL's `label:VIP` is re-serialized into the multiselect list
    // form on the API request.
    await expect(membersApi).toHaveSentFilter('label:[VIP]');
  });

  it('shows no results state when search matches nothing', async () => {
    const membersApi = fakeMembers(({ search }) =>
      search ? [] : [member({ name: 'Existing Member' })],
    );
    await renderAdminApp('/members');

    await expect(membersScreen.memberRows()).toHaveCount(1);

    await membersScreen.searchInput().fill('nonexistentnamestring');

    await expect.element(membersScreen.noResults()).toBeVisible();
    await expect.element(membersScreen.showAllButton()).toBeVisible();
    await expect(membersApi).toHaveSentSearch('nonexistentnamestring');
  });

  it("finds tiers by slug in the tier filter's search dropdown", async () => {
    // The tier filter only appears once more than one paid tier exists.
    const gold = tier({ name: 'Gold Tier' });
    const silver = tier({ name: 'Silver Tier', slug: 'silver-tier' });
    const membersApi = fakeMembers(
      ({ filter }) =>
        filter
          ? [member({ name: 'Silver Member' })]
          : [
              member({ name: 'Paid Member' }),
              member({ name: 'Silver Member' }),
              member({ name: 'Free Member' }),
            ],
      { tiers: [gold, silver] },
    );
    await renderAdminApp('/members');

    await expect(membersScreen.memberRows()).toHaveCount(3);

    await membersScreen.addSearchableFilter('Membership tier', silver.slug, silver.name);

    await expect(membersApi).toHaveSentFilter(`tier_id:[${silver.id}]`);
    await expect(membersScreen.memberRows()).toHaveCount(1);
    await expect.element(membersScreen.link('Silver Member')).toBeVisible();
  });

  it('builds a custom field filter without losing the page to the hydration gate', async () => {
    const fieldsApi = fakeMemberCustomFields([
      {
        namespace: 'custom',
        key: 'employer',
        name: 'Employer',
        type: 'short_text',
        status: 'active',
        created_at: '2026-08-05T00:00:00.000Z',
        updated_at: null,
      },
    ]);
    const membersApi = fakeMembers(({ filter }) =>
      filter ? [member({ name: 'Acme Member' })] : [member({ name: 'Acme Member' }), member()],
    );
    await renderAdminApp('/members', { labs: { membersCustomFields: true } });

    await expect(membersScreen.memberRows()).toHaveCount(2);

    // The filter bar fetches the archived-inclusive catalog up front: it is the query the
    // hydration gate waits on once a filter names a custom field, so it must be answered
    // before a field can be picked — a cold cache here unmounts the page to a spinner on
    // the first keystroke of the value.
    await expect(fieldsApi).toHaveSentFilter('status:[active,archived]');

    await membersScreen.openFilterField('Employer');
    const valueInput = page.getByRole('textbox', { name: 'Employer value' });
    await valueInput.fill('Acme');

    // Still here: typing the value must not unmount the filter UI.
    await expect.element(valueInput).toBeVisible();
    await expect(membersApi).toHaveSentFilter(
      "(metafields.key:'custom.employer'+metafields.value:~'Acme')",
    );
    await expect(membersScreen.memberRows()).toHaveCount(1);

    // Every catalog browse this flow made was the archived-inclusive one the gate shares.
    expect(fieldsApi.requests.map((request) => request.filter)).toEqual(
      fieldsApi.requests.map(() => 'status:[active,archived]'),
    );
  });

  it('builds a name filter through the filters UI', async () => {
    const membersApi = fakeMembers(({ filter }) =>
      filter
        ? [member({ name: 'Alice Alpha' })]
        : [member({ name: 'Alice Alpha' }), member({ name: 'Bob Beta' })],
    );
    await renderAdminApp('/members');

    await expect(membersScreen.memberRows()).toHaveCount(2);

    await membersScreen.addFilter('Name', 'Alice');

    await expect(membersApi).toHaveSentFilter(/name:~'Alice'/);
    await expect(membersScreen.memberRows()).toHaveCount(1);
    await expect.element(membersScreen.link('Alice Alpha')).toBeVisible();
  });
});
