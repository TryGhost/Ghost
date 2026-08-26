import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { fakeMembers, label, member, renderAdminApp, tier } from '@test-utils/acceptance';
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

it.each([false, true])(
  'keeps pinned member headers aligned across resizing and column changes with page chrome %s',
  async (pageChrome) => {
    const vip = label({ name: 'VIP' });
    const api = fakeMembers([member({ name: 'Geometry member', labels: [vip] })]);
    await renderAdminApp('/members', { labs: { admin7PageChrome: pageChrome } });
    await expect.element(membersScreen.link('Geometry member')).toBeVisible();
    const list = () => page.getByTestId('members-list-scroll-root').element();
    const sticky = () => list().firstElementChild as HTMLElement;
    const header = () => document.querySelector('[data-list-page="header"]') as HTMLElement;
    const expectAligned = async () => {
      await expect
        .poll(() => {
          const pinned = sticky().firstElementChild!.firstElementChild!.getBoundingClientRect();
          const measured = sticky()
            .querySelectorAll('table')[1]
            .querySelector('th')!
            .getBoundingClientRect();
          const tableHeaderHeight = sticky()
            .querySelectorAll('table')[1]
            .querySelector('thead')!
            .getBoundingClientRect().height;
          return (
            Math.abs(pinned.width - measured.width) < 0.1 &&
            Math.abs(
              parseFloat(getComputedStyle(sticky()).top) -
                (header().getBoundingClientRect().height - tableHeaderHeight),
            ) < 0.1
          );
        })
        .toBe(true);
    };
    try {
      await expectAligned();
      await page.viewport(1023, 800);
      await expect.poll(() => getComputedStyle(sticky()).display).toBe('none');
      await expect
        .poll(() => sticky().style.getPropertyValue('--members-sticky-column-width'))
        .toBe('');
      expect(header().style.paddingBottom).toBe('');
      expect(header().style.marginBottom).toBe('');
      await page.viewport(1440, 900);
      await expectAligned();
      await membersScreen.addMultiselectFilter('Label', ['VIP']);
      await userEvent.keyboard('{Escape}');
      await expect(api).toHaveSentFilter(`label:[${vip.slug}]`);
      await expect.poll(() => list().querySelector('thead')?.textContent).toContain('Member');
      await expect
        .poll(() => sticky().querySelectorAll('table')[1].querySelector('thead')?.textContent)
        .toContain('Labels');
      await expectAligned();
      // Removing the active column reruns the geometry effect and must restore
      // the original header spacing before applying its new measurements.
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await expect
        .poll(() => sticky().querySelectorAll('table')[1].querySelector('thead')?.textContent)
        .not.toContain('Labels');
      await expectAligned();
    } finally {
      await page.viewport(1280, 800);
    }
  },
);
