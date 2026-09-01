import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

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

const FIELDS: MemberCustomField[] = [
  {
    namespace: 'custom',
    key: 'job_title',
    name: 'Job title',
    type: 'short_text',
    status: 'active',
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: null,
  },
  {
    namespace: 'custom',
    key: 'company',
    name: 'Company',
    type: 'long_text',
    status: 'active',
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: null,
  },
  {
    namespace: 'custom',
    key: 'home_address',
    name: 'Home address',
    type: 'address',
    status: 'active',
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: null,
  },
];

const ADDRESS = { line1: '1 Main St', city: 'Berlin', postal_code: '10115', country: 'DE' };

/**
 * The world the member detail screen reads at mount, plus the custom-fields
 * definitions. Values ride the member read payload (`metafields.custom`), exactly
 * as the API returns them when the site defines fields. The world is stateful: a
 * PUT's merge patch is applied (null deletes), so the refetch a save triggers
 * returns the saved state.
 */
function fakeMemberDetailWorld(m: Member, initialValues: Record<string, unknown>) {
  let current: Record<string, unknown> = { ...m };
  const values: Record<string, unknown> = { ...initialValues };
  fakeMembers([m]);
  fakeAdminEndpoint('GET', new RegExp(`^/members/${m.id}/`), () => ({
    members: [{ ...current, metafields: { custom: { ...values } } }],
  }));
  fakeMemberCustomFields(FIELDS);
  fakeAdminEndpoint('GET', new RegExp('^/members/events/'), {
    events: [],
    meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
  });
  return fakeAdminEndpoint('PUT', new RegExp(`^/members/${m.id}/`), ({ body }) => {
    const { metafields, ...edited } = (body as { members: Array<Record<string, unknown>> })
      .members[0];
    const patch = (metafields as { custom?: Record<string, unknown> } | undefined)?.custom ?? {};
    current = { ...current, ...edited };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) {
        delete values[key];
      } else {
        values[key] = value;
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
      .element(memberDetailScreen.fieldValue('1 Main St, Berlin, 10115, DE'))
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
    const saved = editApi.lastRequest?.body as { members: Array<Record<string, unknown>> };
    expect(saved.members[0].metafields).toEqual({ custom: { job_title: 'Publisher' } });
    expect(saved.members[0].name).toBeUndefined();
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
    const saved = editApi.lastRequest?.body as { members: Array<Record<string, unknown>> };
    expect(saved.members[0].metafields).toEqual({ custom: { job_title: null } });
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

  it('saves an address that leaves sub-fields the country does not use empty', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {});
    await renderAdminApp(`/members/${m.id}`);

    // Hong Kong has no postal code, so leaving it empty is a complete address
    // rather than an incomplete one.
    await memberDetailScreen.editFieldButton('Home address').click();
    await modal().getByLabelText('Address line 1').fill('Flat 3, 8 Wan Chai Road');
    await modal().getByLabelText('City').fill('Hong Kong');
    await modal().getByLabelText('Country').fill('HK');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .element(memberDetailScreen.fieldValue('Flat 3, 8 Wan Chai Road, Hong Kong, HK'))
      .toBeVisible();
    const saved = editApi.lastRequest?.body as { members: Array<Record<string, unknown>> };
    expect(saved.members[0].metafields).toEqual({
      custom: {
        home_address: { line1: 'Flat 3, 8 Wan Chai Road', city: 'Hong Kong', country: 'HK' },
      },
    });
  });

  it('blocks saving a malformed country code with an inline error, then saves once fixed', async () => {
    const m = member({ name: 'Ada Lovelace' });
    const editApi = fakeMemberDetailWorld(m, {});
    await renderAdminApp(`/members/${m.id}`);

    await memberDetailScreen.editFieldButton('Home address').click();
    await modal().getByLabelText('Address line 1').fill('1 Main St');
    await modal().getByLabelText('City').fill('Berlin');
    await modal().getByLabelText('Postal code').fill('10115');
    await modal().getByLabelText('Country').fill('DEU');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    // No request went out; the error says what to do, in plain words.
    await expect
      .element(modal().getByText('Enter a 2-letter country code, like US.'))
      .toBeVisible();
    expect(editApi.requests).toHaveLength(0);

    await modal().getByLabelText('Country').fill('DE');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();

    await expect
      .element(memberDetailScreen.fieldValue('1 Main St, Berlin, 10115, DE'))
      .toBeVisible();
    const saved = editApi.lastRequest?.body as { members: Array<Record<string, unknown>> };
    expect(saved.members[0].metafields).toEqual({ custom: { home_address: ADDRESS } });
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
