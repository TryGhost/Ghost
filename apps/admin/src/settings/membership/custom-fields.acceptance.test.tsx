import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  configResponse,
  fakeAdminEndpoint,
  fakeMemberCustomFields,
  fakeSettingsScreens,
  renderAdminApp,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

const companyField: MemberCustomField = {
  namespace: 'custom',
  key: 'company',
  name: 'Company',
  type: 'short_text',
  status: 'active',
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: null,
};

const archivedField: MemberCustomField = {
  namespace: 'custom',
  key: 'old_hobby',
  name: 'Old hobby',
  type: 'short_text',
  status: 'archived',
  created_at: '2026-07-12T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
};

const flagOn = { labs: { membersCustomFields: true } };

type CustomField = typeof companyField;

function fakeCustomFields(fields: CustomField[] = [companyField]) {
  return fakeMemberCustomFields(fields);
}

/**
 * Mutations invalidate and refetch the list, so a spec observing the list
 * after a create serves it from state that grows when the POST lands; the
 * created entity is declared by the spec, the fake invents nothing.
 * Post-mutation outcomes of edits and deletes are server behavior, owned by
 * the API suite (ghost/core e2e-api member-custom-fields) — those specs
 * assert the outgoing request and the refetch instead.
 */
function fakeCustomFieldsWithCreate(initial: CustomField[], created: CustomField) {
  let fields = initial;
  fakeMemberCustomFields(() => fields);
  return fakeAdminEndpoint('POST', '/members/metafields/custom/', () => {
    fields = [...fields, created];
    return { members_metafields: [created] };
  });
}

describe('Custom fields', () => {
  it('stays hidden and does not query the closed endpoint while the flag is off', async () => {
    fakeSettingsScreens();
    const customFieldsApi = fakeCustomFields();
    await renderAdminApp('/settings');

    await expect(settingsScreen.customFields()).toHaveCount(0);
    expect(customFieldsApi.requests).toHaveLength(0);
  });

  // A host can switch custom fields off for a site separately from the flag, so the
  // feature can be sold with a plan. Settings is where a publisher would go to set fields
  // up, so a limited site is offered nothing to set up. Reading definitions stays open on
  // the server, so this is the check that stops a limited site being shown a section whose
  // every save would come back refused.
  it('stays hidden when the host limit disables the feature', async () => {
    fakeSettingsScreens();
    const customFieldsApi = fakeCustomFields();
    const config = configResponse({ labs: { membersCustomFields: true } });
    config.config.hostSettings = {
      limits: { limitCustomFields: { disabled: true } },
    };
    await renderAdminApp('/settings', {
      ...flagOn,
      boot: { browseConfig: { response: config } },
    });

    await expect(settingsScreen.customFields()).toHaveCount(0);
    expect(customFieldsApi.requests).toHaveLength(0);
  });

  it('stays visible when the host sets the limit but leaves it enabled', async () => {
    fakeSettingsScreens();
    fakeCustomFields();
    const config = configResponse({ labs: { membersCustomFields: true } });
    config.config.hostSettings = {
      limits: { limitCustomFields: { disabled: false } },
    };
    await renderAdminApp('/settings', {
      ...flagOn,
      boot: { browseConfig: { response: config } },
    });

    await expect.element(settingsScreen.customFields()).toBeVisible();
  });

  it('lists each field with its user-facing type, opting into archived fields', async () => {
    fakeSettingsScreens();
    const customFieldsApi = fakeCustomFields();
    await renderAdminApp('/settings', flagOn);

    // Browse hides archived by default; Settings asks for both statuses.
    await expect
      .poll(() => customFieldsApi.lastRequest?.url)
      .toContain('filter=status%3A%5Bactive%2Carchived%5D');

    const row = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(row).toHaveCount(1);
    await expect.element(row).toHaveTextContent('Company');
    await expect.element(row).toHaveTextContent('Short text');
  });

  it('validates and creates a short-text field without sending a key', async () => {
    fakeSettingsScreens();
    fakeCustomFields();
    const createApi = fakeAdminEndpoint('POST', '/members/metafields/custom/', {
      members_metafields: [{ ...companyField, key: 'job_title', name: 'Job Title' }],
    });
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.customFields().getByRole('button', { name: 'Add custom field' }).click();
    const modal = settingsScreen.customFieldModal();
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect.element(modal.getByText('Enter a name for the field')).toBeVisible();

    await modal.getByLabelText('Name').fill('Job Title');
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal).toHaveCount(0);
    expect(createApi.lastRequest?.body).toEqual({
      members_metafields: [{ name: 'Job Title', type: 'short_text' }],
    });
  });

  it('creates the selected long-text field type', async () => {
    fakeSettingsScreens();
    fakeCustomFields();
    const createApi = fakeAdminEndpoint('POST', '/members/metafields/custom/', {
      members_metafields: [{ ...companyField, key: 'bio', name: 'Bio', type: 'long_text' }],
    });
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.customFields().getByRole('button', { name: 'Add custom field' }).click();
    const modal = settingsScreen.customFieldModal();
    await modal.getByLabelText('Name').fill('Bio');
    await modal.getByLabelText('Type').click();
    await page.getByRole('option', { name: /Long text/ }).click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal).toHaveCount(0);
    expect(createApi.lastRequest?.body).toEqual({
      members_metafields: [{ name: 'Bio', type: 'long_text' }],
    });
  });

  it('shows an API duplicate-name error on the name field without leaking the envelope message', async () => {
    fakeSettingsScreens();
    fakeCustomFields();
    const createApi = fakeAdminEndpoint(
      'POST',
      '/members/metafields/custom/',
      {
        errors: [
          {
            type: 'ValidationError',
            message: 'Validation error, cannot save members_custom_field.',
            context: 'A custom field with this name already exists.',
            property: 'name',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.customFields().getByRole('button', { name: 'Add custom field' }).click();
    const modal = settingsScreen.customFieldModal();
    await modal.getByLabelText('Name').fill('Company');
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect
      .element(modal.getByText('A custom field with this name already exists.'))
      .toBeVisible();
    await expect(modal.getByText(/cannot save/)).toHaveCount(0);
    expect(createApi.requests).toHaveLength(1);
  });

  it('renames a field without allowing its type to change', async () => {
    fakeSettingsScreens();
    fakeCustomFields();
    const editApi = fakeAdminEndpoint('PUT', '/members/metafields/custom/company/', {
      members_metafields: [{ ...companyField, name: 'Employer' }],
    });
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.customFields().getByTestId('custom-field-list-item').click();
    const modal = settingsScreen.customFieldModal();
    await expect.element(modal.getByText('Type can’t be changed after creation')).toBeVisible();
    await expect.element(modal.getByTestId('custom-field-type')).toBeDisabled();
    await modal.getByLabelText('Name').fill('Employer');
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal).toHaveCount(0);
    expect(editApi.lastRequest?.body).toEqual({ members_metafields: [{ name: 'Employer' }] });
  });

  it('archives a field only after destructive confirmation', async () => {
    fakeSettingsScreens();
    fakeCustomFields();
    const editApi = fakeAdminEndpoint('PUT', '/members/metafields/custom/company/', {
      members_metafields: [{ ...companyField, status: 'archived' }],
    });
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.customFields().getByTestId('custom-field-list-item').click();
    await settingsScreen.customFieldModal().getByRole('button', { name: 'Archive' }).click();
    const confirmation = settingsScreen.confirmationModal();
    await expect
      .element(confirmation)
      .toHaveTextContent(
        'will no longer show up on your members, collect new information, or appear in filters',
      );
    await expect
      .element(confirmation)
      .toHaveTextContent('Values already collected for this field will remain unchanged');
    await confirmation.getByRole('button', { name: 'Archive' }).click();

    await expect.element(settingsScreen.successToast()).toHaveTextContent('Custom field archived');
    // Archiving is a status edit, not a DELETE — DELETE is permanent removal.
    expect(editApi.lastRequest?.body).toEqual({ members_metafields: [{ status: 'archived' }] });
  });

  it('splits fields into Active and Archived tabs', async () => {
    fakeSettingsScreens();
    fakeCustomFields([companyField, archivedField]);
    await renderAdminApp('/settings', flagOn);

    // Active tab is the default and shows only active fields.
    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(1);
    await expect.element(rows).toHaveTextContent('Company');

    await settingsScreen.customFields().getByRole('tab', { name: 'Archived' }).click();
    await expect(rows).toHaveCount(1);
    await expect.element(rows).toHaveTextContent('Old hobby');
  });

  it('collapses long lists behind Show all, five at a time like recommendations', async () => {
    fakeSettingsScreens();
    const manyFields = Array.from({ length: 7 }, (_, index) => ({
      ...companyField,
      key: `field_${index}`,
      name: `Field ${index}`,
    }));
    fakeCustomFields(manyFields);
    await renderAdminApp('/settings', flagOn);

    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(5);

    await settingsScreen.customFields().getByRole('button', { name: 'Show all' }).click();
    await expect(rows).toHaveCount(7);
    await expect(
      settingsScreen.customFields().getByRole('button', { name: 'Show all' }),
    ).toHaveCount(0);

    // The reveal survives tab switches — Tabs unmount hidden panels, so
    // this pins the state living above them.
    await settingsScreen.customFields().getByRole('tab', { name: 'Archived' }).click();
    await settingsScreen.customFields().getByRole('tab', { name: 'Active' }).click();
    await expect(rows).toHaveCount(7);
  });

  it('reveals a just-created field even when the list is collapsed', async () => {
    fakeSettingsScreens();
    const initialFields = Array.from({ length: 6 }, (_, index) => ({
      ...companyField,
      key: `field_${index}`,
      name: `Field ${index}`,
    }));
    fakeCustomFieldsWithCreate(initialFields, { ...companyField, key: 'newest', name: 'Newest' });
    await renderAdminApp('/settings', flagOn);

    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(5);

    // New fields append at the END of the list — exactly the collapsed
    // slot — so creating one must expand the list rather than swallow it.
    await settingsScreen.customFields().getByRole('button', { name: 'Add custom field' }).click();
    const modal = settingsScreen.customFieldModal();
    await modal.getByLabelText('Name').fill('Newest');
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(rows).toHaveCount(7);
    await expect.element(rows.last()).toHaveTextContent('Newest');

    // Save holds the modal open for its ~500ms saving state. Verify the
    // async save has completed and the parent-controlled modal unmounts.
    await expect(modal).toHaveCount(0);
  });

  it('reorders a field by dragging it, sending the whole list in its new order', async () => {
    fakeSettingsScreens();
    const shirtField = { ...companyField, key: 'shirt_size', name: 'Shirt size' };
    const nicknameField = { ...companyField, key: 'nickname', name: 'Nickname' };
    let currentFields = [companyField, shirtField, nicknameField];
    const browseApi = fakeMemberCustomFields(() => currentFields);
    const reorderApi = fakeAdminEndpoint('PUT', '/members/metafields/custom/', (request) => {
      const order = (request.body as { members_metafields: { key: string }[] }).members_metafields;
      currentFields = order.map(({ key }) => currentFields.find((field) => field.key === key)!);
      return { members_metafields: currentFields };
    });
    await renderAdminApp('/settings', flagOn);

    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(3);
    const browsesBeforeDrag = browseApi.requests.length;

    // A real pointer drag of the handle onto the first row, which is what dnd-kit
    // listens for. Note this cannot be driven from the keyboard: the sortable list
    // does not wire dnd-kit's sortable coordinate getter, so arrow keys move a
    // lifted item by a flat 25px and it never reaches the next row.
    const handle = settingsScreen.customFields().getByLabelText('Reorder Nickname');
    await expect.element(handle).toBeVisible();
    await userEvent.dragAndDrop(handle, rows.first());

    // The whole list goes up, in the order the drag left it, keys only — order is a
    // property of the list, so a field never carries a rank. Nickname was dropped on
    // the first row, so it takes that place and the rest shuffle down.
    await expect
      .poll(() => reorderApi.lastRequest?.body)
      .toEqual({
        members_metafields: [{ key: 'nickname' }, { key: 'company' }, { key: 'shirt_size' }],
      });

    // The row stays where it was dropped rather than snapping back and jumping when
    // the response lands.
    await expect.element(rows.first()).toHaveTextContent('Nickname');

    // And the response settles it, so the list is never re-read. A reorder only
    // succeeds when it named exactly the fields the site has, so its response says
    // everything a fetch would and the round-trip is not repeated.
    expect(browseApi.requests.length).toBe(browsesBeforeDrag);
  });

  it('leaves the dragged field where it was dropped while the request is in flight', async () => {
    fakeSettingsScreens();
    const nicknameField = { ...companyField, key: 'nickname', name: 'Nickname' };
    let currentFields = [companyField, nicknameField];
    fakeMemberCustomFields(() => currentFields);

    // The PUT is held open so the assertion below lands while the request is still
    // outstanding. Without the local move, the list would revert to the server's
    // order the moment the drag ends and the row would snap back under the cursor.
    let releasePut: () => void = () => {};
    const putHeld = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    fakeAdminEndpoint('PUT', '/members/metafields/custom/', async (request) => {
      await putHeld;
      const order = (request.body as { members_metafields: { key: string }[] }).members_metafields;
      currentFields = order.map(({ key }) => currentFields.find((field) => field.key === key)!);
      return { members_metafields: currentFields };
    });
    await renderAdminApp('/settings', flagOn);

    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(2);

    await userEvent.dragAndDrop(
      settingsScreen.customFields().getByLabelText('Reorder Nickname'),
      rows.first(),
    );

    await expect.element(rows.first()).toHaveTextContent('Nickname');

    // Let the request finish so it isn't left hanging. Whether the row survives the
    // settled response is the drag test's job — repeating the assertion here would
    // resolve against this same pre-release state and prove nothing.
    releasePut();
  });

  it('puts the list back and says why when the order is refused', async () => {
    fakeSettingsScreens();
    const nicknameField = { ...companyField, key: 'nickname', name: 'Nickname' };
    // What the server has, and what this screen does not know about yet: a third
    // field a colleague added since the page loaded.
    const serverFields = [
      companyField,
      nicknameField,
      { ...companyField, key: 'added_elsewhere', name: 'Added elsewhere' },
    ];
    let browses = 0;
    fakeMemberCustomFields(() => {
      browses += 1;
      // The first load predates the colleague's field; a refetch sees it.
      return browses === 1 ? [companyField, nicknameField] : serverFields;
    });
    fakeAdminEndpoint(
      'PUT',
      '/members/metafields/custom/',
      {
        errors: [
          {
            type: 'ValidationError',
            message: 'The order must name every custom field.',
            context: '"added_elsewhere" is missing from the order. Reload and try again.',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp('/settings', flagOn);

    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(2);

    await userEvent.dragAndDrop(
      settingsScreen.customFields().getByLabelText('Reorder Nickname'),
      rows.first(),
    );

    // The server's own words reach the publisher, not a generic failure: they name
    // the field and say what to do about it. And the list goes back to the order the
    // server holds rather than keeping an arrangement that was refused.
    await expect.element(page.getByText(/is missing from the order/)).toBeVisible();
    await expect.element(rows.first()).toHaveTextContent('Company');
  });

  it('sends the archived fields too, keeping their places in the order', async () => {
    fakeSettingsScreens();
    const shirtField = { ...companyField, key: 'shirt_size', name: 'Shirt size' };
    // Archived between the two active fields, which is the arrangement that catches a
    // move applied to the visible tab instead of the whole list.
    let currentFields = [companyField, archivedField, shirtField];
    fakeMemberCustomFields(() => currentFields);
    const reorderApi = fakeAdminEndpoint('PUT', '/members/metafields/custom/', (request) => {
      const order = (request.body as { members_metafields: { key: string }[] }).members_metafields;
      currentFields = order.map(({ key }) => currentFields.find((field) => field.key === key)!);
      return { members_metafields: currentFields };
    });
    await renderAdminApp('/settings', flagOn);

    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(2);

    await userEvent.dragAndDrop(
      settingsScreen.customFields().getByLabelText('Reorder Shirt size'),
      rows.first(),
    );

    // The archived field is named even though it was never on screen: an order states
    // the whole list, and the API refuses one that leaves a field out.
    await expect
      .poll(() => reorderApi.lastRequest?.body)
      .toEqual({
        members_metafields: [{ key: 'shirt_size' }, { key: 'company' }, { key: 'old_hobby' }],
      });
  });

  it('reorders from a collapsed list without disturbing the fields behind Show all', async () => {
    fakeSettingsScreens();
    let currentFields = Array.from({ length: 7 }, (_, index) => ({
      ...companyField,
      key: `field_${index}`,
      name: `Field ${index}`,
    }));
    fakeMemberCustomFields(() => currentFields);
    const reorderApi = fakeAdminEndpoint('PUT', '/members/metafields/custom/', (request) => {
      const order = (request.body as { members_metafields: { key: string }[] }).members_metafields;
      currentFields = order.map(({ key }) => currentFields.find((field) => field.key === key)!);
      return { members_metafields: currentFields };
    });
    await renderAdminApp('/settings', flagOn);

    const rows = settingsScreen.customFields().getByTestId('custom-field-list-item');
    await expect(rows).toHaveCount(5);

    await userEvent.dragAndDrop(
      settingsScreen.customFields().getByLabelText('Reorder Field 2'),
      rows.first(),
    );

    // The two fields the publisher cannot see are still named, and still last.
    await expect
      .poll(() => reorderApi.lastRequest?.body)
      .toEqual({
        members_metafields: [
          { key: 'field_2' },
          { key: 'field_0' },
          { key: 'field_1' },
          { key: 'field_3' },
          { key: 'field_4' },
          { key: 'field_5' },
          { key: 'field_6' },
        ],
      });
  });

  it('does not offer dragging on the archived tab', async () => {
    fakeSettingsScreens();
    fakeCustomFields([companyField, archivedField]);
    await renderAdminApp('/settings', flagOn);

    // An archived field holds its place in the order, but there is nowhere to see
    // it, so there is nothing to drag it through.
    await settingsScreen.customFields().getByRole('tab', { name: 'Archived' }).click();

    await expect(settingsScreen.customFields().getByTestId('custom-field-list-item')).toHaveCount(
      1,
    );
    await expect(settingsScreen.customFields().getByLabelText(/^Reorder /)).toHaveCount(0);
  });

  it('permanently deletes an archived field from the header menu, after a heavy warning', async () => {
    fakeSettingsScreens();
    const customFieldsApi = fakeCustomFields([companyField, archivedField]);
    const deleteApi = fakeAdminEndpoint('DELETE', '/members/metafields/custom/old_hobby/', {});
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.customFields().getByRole('tab', { name: 'Archived' }).click();
    await settingsScreen.customFields().getByTestId('custom-field-list-item').click();

    // Deletion hides behind the modal's header menu — never a visible button.
    const modal = settingsScreen.customFieldModal();
    await modal.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('menuitem', { name: 'Delete custom field' }).click();

    const confirmation = settingsScreen.confirmationModal();
    await expect
      .element(confirmation)
      .toHaveTextContent(
        'Old hobby and every value collected from your members will be permanently deleted from the database. This can’t be undone.',
      );
    const fetchesBeforeConfirm = customFieldsApi.requests.length;
    await confirmation.getByRole('button', { name: 'Delete' }).click();

    await expect.element(settingsScreen.successToast()).toHaveTextContent('Custom field deleted');
    expect(deleteApi.requests).toHaveLength(1);

    // The list refetches after the delete; the refreshed outcome (the
    // field leaving Archived) is server behavior, owned by the API suite.
    await expect.poll(() => customFieldsApi.requests.length).toBeGreaterThan(fetchesBeforeConfirm);
  });

  it('does not expose permanent deletion for an active field', async () => {
    fakeSettingsScreens();
    fakeCustomFields([companyField]);
    await renderAdminApp('/settings', flagOn);

    // Deletion lives behind the header menu, and an active field has none —
    // the UI can't reach delete, matching the API's archived-only rule.
    await settingsScreen.customFields().getByTestId('custom-field-list-item').click();
    const modal = settingsScreen.customFieldModal();
    await expect(modal.getByRole('button', { name: 'Menu' })).toHaveCount(0);
  });

  it('shows no tabs at all while no fields exist', async () => {
    fakeSettingsScreens();
    fakeCustomFields([]);
    await renderAdminApp('/settings', flagOn);

    await expect.element(settingsScreen.customFields()).toBeVisible();
    await expect(settingsScreen.customFields().getByRole('tab')).toHaveCount(0);
  });

  it('reactivates an archived field after confirmation, as a status edit', async () => {
    fakeSettingsScreens();
    const customFieldsApi = fakeCustomFields([companyField, archivedField]);
    const editApi = fakeAdminEndpoint('PUT', '/members/metafields/custom/old_hobby/', {
      members_metafields: [{ ...archivedField, status: 'active' }],
    });
    await renderAdminApp('/settings', flagOn);

    await settingsScreen.customFields().getByRole('tab', { name: 'Archived' }).click();
    await settingsScreen.customFields().getByTestId('custom-field-list-item').click();
    await settingsScreen.customFieldModal().getByRole('button', { name: 'Reactivate' }).click();
    const confirmation = settingsScreen.confirmationModal();
    await expect
      .element(confirmation)
      .toHaveTextContent('Values already collected for this field will remain unchanged');
    const fetchesBeforeConfirm = customFieldsApi.requests.length;
    await confirmation.getByRole('button', { name: 'Reactivate' }).click();

    await expect
      .element(settingsScreen.successToast())
      .toHaveTextContent('Custom field reactivated');
    expect(editApi.lastRequest?.body).toEqual({ members_metafields: [{ status: 'active' }] });

    // The list refetches after the edit; the refreshed outcome (the field
    // moving back under Active) is server behavior, owned by the API suite.
    await expect.poll(() => customFieldsApi.requests.length).toBeGreaterThan(fetchesBeforeConfirm);
  });
});
