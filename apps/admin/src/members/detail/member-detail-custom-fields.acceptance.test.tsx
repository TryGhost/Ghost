import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeMemberCustomFields,
  fakeMembers,
  member,
  renderAdminApp,
  type Member,
} from '@test-utils/acceptance';
import { memberDetailScreen } from './member-detail.screen';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';
import {
  SHAPES,
  accept,
  heldValue,
  shaped,
  type FieldShape,
  type ShapedField,
  type TypedSettings,
} from '@tryghost/metafield-types';
import { z } from 'zod';

const SaveBody = z.object({ members: z.tuple([z.record(z.string(), z.unknown())]) });
const savedMember = (body: unknown) => SaveBody.parse(body).members[0];

const MetafieldsPatch = z
  .object({ custom: z.record(z.string(), z.unknown()).optional() })
  .optional();

const FIELDS: MemberCustomField[] = [
  {
    namespace: CUSTOM_NAMESPACE,
    key: KeySchema.parse('job_title'),
    name: 'Job title',
    type: 'short_text',
    status: 'active',
    access: { member: 'none' },
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: null,
  },
  {
    namespace: CUSTOM_NAMESPACE,
    key: KeySchema.parse('company'),
    name: 'Company',
    type: 'long_text',
    status: 'active',
    access: { member: 'none' },
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: null,
  },
  {
    namespace: CUSTOM_NAMESPACE,
    key: KeySchema.parse('home_address'),
    name: 'Home address',
    type: 'address',
    status: 'active',
    access: { member: 'none' },
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: null,
  },
];

const ADDRESS = { line1: '1 Main St', city: 'Berlin', postal_code: '10115', country: 'DE' };

const MOBILE: MemberCustomField = {
  namespace: CUSTOM_NAMESPACE,
  key: KeySchema.parse('mobile'),
  name: 'Mobile',
  type: 'phone',
  status: 'active',
  access: { member: 'none' },
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: null,
};

/** What a write the members API accepts does to what the member holds, as the domain says. */
function applied<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  held: unknown,
  write: unknown,
): unknown {
  const acceptance = accept(of, write);
  if (!acceptance.success) {
    throw new Error(`the members API would refuse ${JSON.stringify(write)}`);
  }
  return SHAPES[of.shape].apply(heldValue(of, held), acceptance.accepted.value);
}

/**
 * The world the member detail screen reads at mount. Stateful on purpose: the real
 * endpoint treats a PUT as a merge patch, writing only the keys present and deleting a key
 * sent as null, and applies each field's write as the domain says, so the refetch a save
 * triggers must return the merged result, not the original.
 */
function fakeMemberDetailWorld(
  m: Member,
  initialValues: Record<string, unknown>,
  fields: MemberCustomField[] = FIELDS,
) {
  let current: Record<string, unknown> = { ...m };
  const values: Record<string, unknown> = { ...initialValues };
  fakeMembers([m]);
  fakeAdminEndpoint('GET', new RegExp(`^/members/${m.id}/`), () => ({
    members: [{ ...current, metafields: { custom: { ...values } } }],
  }));
  fakeMemberCustomFields(fields);
  fakeAdminEndpoint('GET', new RegExp('^/members/events/'), {
    events: [],
    meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
  });
  return fakeAdminEndpoint('PUT', new RegExp(`^/members/${m.id}/`), ({ body }) => {
    const { metafields, ...edited } = savedMember(body);
    const patch = MetafieldsPatch.parse(metafields)?.custom ?? {};
    current = { ...current, ...edited };
    for (const [key, value] of Object.entries(patch)) {
      const field = fields.find((candidate) => candidate.key === key);
      if (!field) {
        throw new Error(`the members API would refuse the unknown field ${key}`);
      }
      const after = value === null ? undefined : applied(shaped(field), values[key], value);
      if (after === undefined) {
        delete values[key];
      } else {
        values[key] = after;
      }
    }
    return { members: [{ ...current, metafields: { custom: { ...values } } }] };
  });
}

const modal = () => memberDetailScreen.fieldEditModal();

describe('Member detail custom fields', () => {
  it('renders the member’s values as a read-only record, addresses as one line', async () => {
    const m = member({ name: 'Ada Lovelace' });
    fakeMemberDetailWorld(m, { job_title: 'Editor', home_address: ADDRESS });
    await renderAdminApp(`/members/${m.id}`);

    await expect.element(memberDetailScreen.fieldValue('Editor')).toBeVisible();
    await expect
      .element(memberDetailScreen.fieldValue('1 Main St, Berlin, 10115, Germany'))
      .toBeVisible();
    // Company has no value: its row shows the empty dash, and nothing on
    // the page is an editable input for custom fields.
    await expect.element(memberDetailScreen.emptyValueDash()).toBeVisible();
    await expect.element(memberDetailScreen.fieldTextbox('Job title')).not.toBeInTheDocument();
  });

  it('saves one field through its own editor without touching the page Save', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, { job_title: 'Editor', company: 'Ghost' });
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Job title').click();
    await modal().getByLabelText('Job title').fill('Publisher');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    // The row reflects the save; the page Save never became involved.
    await expect.element(memberDetailScreen.fieldValue('Publisher')).toBeVisible();
    await expect.element(modal()).not.toBeInTheDocument();
    await expect.element(memberDetailScreen.saveButton()).toBeDisabled();
    // The payload was a single-field merge patch: only this key, nothing else.
    const saved = savedMember(editApi.lastRequest?.body);
    expect(saved.metafields).toEqual({ custom: { job_title: 'Publisher' } });
    expect(saved.name).toBeUndefined();
  });

  it('leaves an unsaved page edit intact when a custom field is saved', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, { job_title: 'Editor' });
    await renderAdminApp(`/members/${m.id}`);

    // Dirty the page draft by editing the name, without saving it.
    await memberDetailScreen.nameInput().fill('Ada L.');
    const pageSave = memberDetailScreen.saveButton();
    await expect.element(pageSave).toBeEnabled();

    // A custom-field save triggers a member refetch. That refetch must not
    // reseed the page draft — the unsaved name edit has to survive, and the
    // field payload must not carry the name.
    await memberDetailScreen.editFieldButton('Job title').click();
    await modal().getByLabelText('Job title').fill('Publisher');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await expect.element(memberDetailScreen.fieldValue('Publisher')).toBeVisible();

    await expect.element(memberDetailScreen.nameInput()).toHaveValue('Ada L.');
    await expect.element(pageSave).toBeEnabled();
    expect(editApi.lastRequest?.body).toEqual({
      members: [{ id: m.id, metafields: { custom: { job_title: 'Publisher' } } }],
    });
  });

  it('clears a value by saving an emptied editor (null merge patch)', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, { job_title: 'Editor' });
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Job title').click();
    await modal().getByLabelText('Job title').fill('');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    // The editor closes only on save success — the reliable "saved" signal
    // here, since other empty rows already show the dash.
    await expect.element(modal()).not.toBeInTheDocument();
    await expect.element(memberDetailScreen.emptyValueDash()).toBeVisible();
    const saved = savedMember(editApi.lastRequest?.body);
    expect(saved.metafields).toEqual({ custom: { job_title: null } });
  });

  it('a dirty editor refuses casual dismissal; a pristine one closes freely', async () => {
    const m = member({ name: 'Ada Lovelace' });
    fakeMemberDetailWorld(m, { job_title: 'Editor' });
    await renderAdminApp(`/members/${m.id}`);

    // Dirty: Escape must NOT close it — typed values can't be lost to a
    // stray key or click; Cancel is the one explicit discard.
    await memberDetailScreen.editFieldButton('Job title').click();
    await modal().getByLabelText('Job title').fill('Publisher');
    await userEvent.keyboard('{Escape}');
    await expect.element(modal()).toBeVisible();
    await modal().getByRole('button', { name: 'Cancel' }).click();
    await expect.element(modal()).not.toBeInTheDocument();

    // Pristine: Escape dismisses without ceremony.
    await memberDetailScreen.editFieldButton('Job title').click();
    await expect.element(modal()).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(modal()).not.toBeInTheDocument();
  });

  it('cancelling the editor discards the edit', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, { job_title: 'Editor' });
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Job title').click();
    await modal().getByLabelText('Job title').fill('Publisher');
    await modal().getByRole('button', { name: 'Cancel' }).click();

    await expect.element(memberDetailScreen.fieldValue('Editor')).toBeVisible();
    expect(editApi.requests).toHaveLength(0);
  });

  it('takes a phone number in a phone input and keeps it in international form', async () => {
    const m = member({ name: 'Ada Lovelace' });
    fakeMemberDetailWorld(m, {}, [...FIELDS, MOBILE]);
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Mobile').click();
    const input = modal().getByLabelText('Mobile');
    await expect.element(input).toHaveAttribute('type', 'tel');
    // Staff type a member's number, so the browser mustn't offer their own.
    await expect.element(input).toHaveAttribute('autocomplete', 'off');
    await input.fill('+44 (0)20 7946 0000');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect.element(modal()).not.toBeInTheDocument();
    await expect.element(memberDetailScreen.fieldValue('+442079460000')).toBeVisible();
  });

  it('asks for the country code before saving a phone number written without one', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {}, [...FIELDS, MOBILE]);
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Mobile').click();
    await modal().getByLabelText('Mobile').fill('020 7946 0000');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .element(
        modal().getByText(
          'Enter the phone number with its country code, starting with +, like +44 20 7946 0000.',
        ),
      )
      .toBeVisible();
    expect(editApi.requests).toHaveLength(0);
  });

  it('saves an address that leaves parts the country does not use empty', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {});
    await renderAdminApp(`/members/${m.id}`);

    // Hong Kong has no postal code, so leaving it empty is a complete address
    // rather than an incomplete one.
    await memberDetailScreen.editFieldButton('Home address').click();
    await modal().getByLabelText('Address line 1').fill('Flat 3, 8 Wan Chai Road');
    await modal().getByLabelText('City').fill('Hong Kong');
    await modal().getByRole('combobox', { name: 'Country' }).click();
    await page.getByPlaceholder('Search countries...').fill('Hong Kong');
    await page.getByRole('option', { name: /Hong Kong/ }).click();
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    // The country reads by name; its exact wording is the browser's ("Hong Kong" in
    // Chromium, "Hong Kong SAR China" elsewhere), so only the stable part is pinned.
    await expect
      .element(page.getByText(/^Flat 3, 8 Wan Chai Road, Hong Kong, Hong Kong/))
      .toBeVisible();
    const saved = savedMember(editApi.lastRequest?.body);
    expect(saved.metafields).toEqual({
      custom: {
        home_address: { line1: 'Flat 3, 8 Wan Chai Road', city: 'Hong Kong', country: 'HK' },
      },
    });
  });

  it('reads a stored country the list does not hold, and lets staff pick away from it', async () => {
    // Stripe's "unknown region" code is not a country a picker offers, but a checkout
    // can store it, so the editor has to show it rather than nothing.
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {
      home_address: { line1: '1 Main St', country: 'ZZ' },
    });
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Home address').click();
    await expect
      .element(modal().getByRole('combobox', { name: 'Country' }))
      .toHaveTextContent('Unknown Region');

    await modal().getByRole('combobox', { name: 'Country' }).click();
    await page.getByPlaceholder('Search countries...').fill('Germ');
    await page.getByRole('option', { name: 'Germany' }).click();
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect.element(memberDetailScreen.fieldValue('1 Main St, Germany')).toBeVisible();
    const saved = savedMember(editApi.lastRequest?.body);
    expect(saved.metafields).toEqual({ custom: { home_address: { country: 'DE' } } });
  });

  it('saves the country picked from the list as its code', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {});
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Home address').click();
    await modal().getByLabelText('Address line 1').fill('1 Main St');
    await modal().getByLabelText('City').fill('Berlin');
    await modal().getByLabelText('Postal code').fill('10115');
    await modal().getByRole('combobox', { name: 'Country' }).click();
    await page.getByPlaceholder('Search countries...').fill('Germ');
    await page.getByRole('option', { name: 'Germany' }).click();
    await expect
      .element(modal().getByRole('combobox', { name: 'Country' }))
      .toHaveTextContent('Germany');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .element(memberDetailScreen.fieldValue('1 Main St, Berlin, 10115, Germany'))
      .toBeVisible();
    const saved = savedMember(editApi.lastRequest?.body);
    expect(saved.metafields).toEqual({ custom: { home_address: ADDRESS } });
  });

  it('clears a country by picking the chosen one again', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {
      home_address: { line1: '1 Main St', city: 'Berlin', country: 'DE' },
    });
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Home address').click();
    await modal().getByRole('combobox', { name: 'Country' }).click();
    await page.getByRole('option', { name: 'Germany' }).click();
    await expect
      .element(modal().getByRole('combobox', { name: 'Country' }))
      .toHaveTextContent('Select...');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    // The emptied part is named in the write as null, since leaving it out would read as
    // "no change"; the parts that didn't change aren't named, and stay.
    await expect.element(memberDetailScreen.fieldValue('1 Main St, Berlin')).toBeVisible();
    const saved = savedMember(editApi.lastRequest?.body);
    expect(saved.metafields).toEqual({ custom: { home_address: { country: null } } });
  });

  it('shows a stored malformed country code as it is, and leaves it alone until replaced', async () => {
    // Staff pick a country from a list, but an import can store a code the list doesn't offer.
    // The code loads as it is, so it can be seen, and a save that changes other parts leaves it
    // alone: the save names only the parts that changed.
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {
      home_address: { line1: '1 Main St', country: 'DEU' },
    });
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Home address').click();
    await expect
      .element(modal().getByRole('combobox', { name: 'Country' }))
      .toHaveTextContent('DEU');
    await modal().getByLabelText('City').fill('Berlin');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect.element(memberDetailScreen.fieldValue('1 Main St, Berlin, DEU')).toBeVisible();
    expect(savedMember(editApi.lastRequest?.body).metafields).toEqual({
      custom: { home_address: { city: 'Berlin' } },
    });

    await memberDetailScreen.editFieldButton('Home address').click();
    await modal().getByRole('combobox', { name: 'Country' }).click();
    await page.getByPlaceholder('Search countries...').fill('Germ');
    await page.getByRole('option', { name: 'Germany' }).click();
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect.element(memberDetailScreen.fieldValue('1 Main St, Berlin, Germany')).toBeVisible();
    expect(savedMember(editApi.lastRequest?.body).metafields).toEqual({
      custom: { home_address: { country: 'DE' } },
    });
  });

  it('pins a server-side 422 to the field it names, inside the editor', async () => {
    const m = member({ name: 'Ada Lovelace' });
    fakeMemberDetailWorld(m, {});
    // Registered after the stateful world, so it wins the PUT: the server
    // rejects with the contract's dotted property path.
    fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/members/${m.id}/`),
      {
        errors: [
          {
            property: 'metafields.custom.job_title',
            context: 'Rejected by the server for reasons the client could not know.',
            message: 'Validation error, cannot edit member.',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Job title').click();
    await modal().getByLabelText('Job title').fill('Editor');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .element(modal().getByText('Rejected by the server for reasons the client could not know.'))
      .toBeVisible();
  });

  describe('a list', () => {
    const animals: MemberCustomField = {
      ...FIELDS[0],
      key: KeySchema.parse('favourite_animals'),
      name: 'Favourite animals',
      type: 'list',
      settings: { options: ['Dog', 'Cat', 'Fish'], multiple: true },
    };

    it('shows every option a member holds, including one the field no longer offers', async () => {
      const m = member({ name: 'Ada Lovelace' });
      fakeMemberDetailWorld(m, { favourite_animals: ['Cat', 'Dolphin'] }, [animals]);
      await renderAdminApp(`/members/${m.id}`);

      // One chip per answer, since an option's text can hold a comma.
      const row = memberDetailScreen.editFieldButton('Favourite animals');
      await expect.element(row.getByText('Cat', { exact: true })).toBeVisible();
      await expect.element(row.getByText('Dolphin', { exact: true })).toBeVisible();
      await expect.element(row).toHaveAccessibleName('Edit Favourite animals: Cat, Dolphin');
    });

    it('closes the open list on Escape and keeps the editor', async () => {
      const m = member({ name: 'Ada Lovelace' });
      fakeMemberDetailWorld(m, { favourite_animals: ['Fish'] }, [animals]);
      await renderAdminApp(`/members/${m.id}`);

      await memberDetailScreen.editFieldButton('Favourite animals').click();
      await modal().getByLabelText('Favourite animals').click();
      await expect.element(page.getByRole('option', { name: 'Dog' })).toBeVisible();
      await userEvent.keyboard('{Escape}');

      await expect.element(page.getByRole('option', { name: 'Dog' })).not.toBeInTheDocument();
      await expect.element(modal()).toBeVisible();
    });

    it('opens a list’s editor on its picker, not on an answer’s remove button', async () => {
      const m = member({ name: 'Ada Lovelace' });
      fakeMemberDetailWorld(m, { favourite_animals: ['Fish'] }, [animals]);
      await renderAdminApp(`/members/${m.id}`);

      await memberDetailScreen.editFieldButton('Favourite animals').click();

      await expect.element(modal().getByLabelText('Favourite animals')).toHaveFocus();
    });

    // The editor offers only what the field offers now, so it can open empty for a member who
    // holds answers. Saving it empty clears them.
    it('clears answers the editor can’t show when it is saved empty', async () => {
      const m = member({ name: 'Ada Lovelace' });
      const editApi = fakeMemberDetailWorld(m, { favourite_animals: ['Dolphin'] }, [animals]);
      await renderAdminApp(`/members/${m.id}`);

      await memberDetailScreen.editFieldButton('Favourite animals').click();
      await modal().getByRole('button', { name: 'Save', exact: true }).click();

      await expect.element(modal()).not.toBeInTheDocument();
      await expect
        .poll(() => editApi.lastRequest && savedMember(editApi.lastRequest.body).metafields)
        .toEqual({ custom: { favourite_animals: null } });
    });

    it('keeps answers the editor can’t show when its other answers are saved unchanged', async () => {
      const m = member({ name: 'Ada Lovelace' });
      const editApi = fakeMemberDetailWorld(m, { favourite_animals: ['Fish', 'Dolphin'] }, [
        animals,
      ]);
      await renderAdminApp(`/members/${m.id}`);

      await memberDetailScreen.editFieldButton('Favourite animals').click();
      await modal().getByRole('button', { name: 'Save', exact: true }).click();

      await expect.element(modal()).not.toBeInTheDocument();
      expect(editApi.lastRequest).toBeUndefined();
    });

    it('saves the options picked, in the order the field offers them', async () => {
      const m = member({ name: 'Ada Lovelace' });
      const editApi = fakeMemberDetailWorld(m, { favourite_animals: ['Fish'] }, [animals]);
      await renderAdminApp(`/members/${m.id}`);

      await memberDetailScreen.editFieldButton('Favourite animals').click();
      await modal().getByLabelText('Favourite animals').click();
      await page.getByRole('option', { name: 'Dog' }).click();
      await userEvent.keyboard('{Escape}');
      await modal().getByRole('button', { name: 'Save', exact: true }).click();

      await expect
        .element(memberDetailScreen.editFieldButton('Favourite animals'))
        .toHaveAccessibleName('Edit Favourite animals: Dog, Fish');
      await expect
        .poll(() => editApi.lastRequest && savedMember(editApi.lastRequest.body).metafields)
        .toEqual({ custom: { favourite_animals: ['Dog', 'Fish'] } });
    });
  });

  it('shows long text with its line breaks, up to four lines of it', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const about = 'First line\n\nThird line\nFourth line\nFifth line';
    fakeMemberDetailWorld(m, { job_title: 'Editor', company: about });
    await renderAdminApp(`/members/${m.id}`);

    const row = memberDetailScreen.editFieldButton('Company');
    await expect.element(row).toBeVisible();
    const spans = [...row.element().querySelectorAll('span')];
    const value = spans.find((span) => span.textContent === about);
    if (!value) {
      throw new Error('the long text value is not shown as it is held');
    }
    const style = getComputedStyle(value);
    expect(style.whiteSpace).toBe('pre-line');
    // Five lines held, four shown: the row opens the editor, which shows all of them.
    expect(value.getBoundingClientRect().height).toBeCloseTo(4 * parseFloat(style.lineHeight), 0);

    // Short text stays on the line it's written on.
    const short = [
      ...memberDetailScreen.editFieldButton('Job title').element().querySelectorAll('span'),
    ].find((span) => span.textContent === 'Editor');
    expect(short && getComputedStyle(short).whiteSpace).toBe('normal');
  });

  it('shows the first five fields, and the rest when asked', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const more = ['Nickname', 'Team', 'Pronouns'].map((name): MemberCustomField => ({
      ...FIELDS[0],
      key: KeySchema.parse(name.toLowerCase()),
      name,
    }));
    fakeMemberDetailWorld(m, {}, [...FIELDS, ...more]);
    await renderAdminApp(`/members/${m.id}`);

    const section = memberDetailScreen.customFieldsSection();
    await expect.element(section.getByRole('button', { name: 'Show all' })).toBeVisible();
    await expect(section.getByRole('button', { name: /^Edit / })).toHaveCount(5);
    await expect(section.getByRole('button', { name: 'Edit Pronouns' })).toHaveCount(0);

    await section.getByRole('button', { name: 'Show all' }).click();

    await expect(section.getByRole('button', { name: /^Edit / })).toHaveCount(6);
    await expect(section.getByRole('button', { name: 'Show all' })).toHaveCount(0);
    // The button is gone, so focus moves to the first field it revealed.
    await expect.element(section.getByRole('button', { name: 'Edit Pronouns' })).toHaveFocus();
  });

  it('starts the next member on the first five fields', async () => {
    const ada = member({ name: 'Ada Lovelace' });
    const grace = member({ name: 'Grace Hopper' });
    const more = ['Nickname', 'Team', 'Pronouns'].map((name): MemberCustomField => ({
      ...FIELDS[0],
      key: KeySchema.parse(name.toLowerCase()),
      name,
    }));
    fakeMembers([ada, grace]);
    for (const m of [ada, grace]) {
      fakeAdminEndpoint('GET', new RegExp(`^/members/${m.id}/`), {
        members: [{ ...m, metafields: { custom: {} } }],
      });
    }
    fakeMemberCustomFields([...FIELDS, ...more]);
    fakeAdminEndpoint('GET', new RegExp('^/members/events/'), {
      events: [],
      meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
    });
    // Grace's record is cached, so moving back to her keeps the section on screen.
    await renderAdminApp(`/members/${grace.id}`);
    const section = memberDetailScreen.customFieldsSection();
    await expect.element(section.getByRole('button', { name: 'Show all' })).toBeVisible();
    window.location.hash = `/members/${ada.id}`;
    await expect.element(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
    await section.getByRole('button', { name: 'Show all' }).click();
    await expect(section.getByRole('button', { name: /^Edit / })).toHaveCount(6);

    window.location.hash = `/members/${grace.id}`;

    await expect.element(page.getByRole('heading', { name: 'Grace Hopper' })).toBeVisible();
    await expect(section.getByRole('button', { name: /^Edit / })).toHaveCount(5);
    await expect.element(section.getByRole('button', { name: 'Show all' })).toBeVisible();
  });

  it('shows five fields without asking', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const more = ['Nickname', 'Team'].map((name): MemberCustomField => ({
      ...FIELDS[0],
      key: KeySchema.parse(name.toLowerCase()),
      name,
    }));
    fakeMemberDetailWorld(m, {}, [...FIELDS, ...more]);
    await renderAdminApp(`/members/${m.id}`);

    const section = memberDetailScreen.customFieldsSection();
    await expect(section.getByRole('button', { name: /^Edit / })).toHaveCount(5);
    await expect(section.getByRole('button', { name: 'Show all' })).toHaveCount(0);
  });

  it('hides the section when the site has no custom fields defined', async () => {
    const m = member({ name: 'Ada Lovelace' });
    fakeMembers([m]);
    fakeAdminEndpoint('GET', new RegExp(`^/members/${m.id}/`), {
      members: [{ ...m, metafields: { custom: {} } }],
    });
    fakeMemberCustomFields([]);
    fakeAdminEndpoint('GET', new RegExp('^/members/events/'), {
      events: [],
      meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
    });
    await renderAdminApp(`/members/${m.id}`);

    await expect.element(memberDetailScreen.nameInput()).toBeVisible();
    await expect.element(memberDetailScreen.customFieldsSection()).not.toBeInTheDocument();
  });
});
