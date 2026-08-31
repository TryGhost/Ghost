import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeMemberCustomFields,
  fakeMembers,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { importMembersScreen } from './import-members.screen';
import { membersScreen } from './members.screen';

// Both flags: the redesigned dialog is what this file exercises, and custom fields are what it
// exercises it for. They are separate switches — the redesign ships without custom fields.
const FLAGS = { labs: { membersImportRedesign: true, membersCustomFields: true } };
const WITHOUT_CUSTOM_FIELDS = { labs: { membersImportRedesign: true } };

// A `nickname` column no defined field matches, alongside the columns auto-detection claims.
// `name` is present deliberately: it takes the /name/i heuristic, which would otherwise map
// `nickname` to the member's name and leave nothing unmatched to create.
const CSV =
  'email,name,nickname,city,postcode\nada@example.com,Ada Lovelace,Countess,London,E1 6AN\n';

// A hand-edited or partially-exported file: row 1 carries fewer cells than the header, which
// papaparse reports as a row with fewer keys rather than padding it out.
const RAGGED_CSV = 'email,name,note\nada@example.com\ngrace@example.com,Grace Hopper,Hi\n';

// A Ghost export re-imported somewhere its field no longer exists: archived since, or a
// different site. The header says what the column is even though nothing matches it.
// Every browse of the field list, whether or not it carries a status filter: the members
// screen behind this modal asks for archived fields too, and an exact-path fake would
// leave that request unhandled.
const customFieldsBrowsePath = new RegExp('^/members/metafields/custom/(\\?|$)');

const EXPORTED_CSV = 'email,custom_fields.nickname\nada@example.com,Countess\n';

/**
 * The world the import modal reads: no custom fields defined yet, a create that mints a
 * key from the name the way the service does, and a browse reflecting what has been
 * created, so the picker behaves as it would against a real site.
 */
function fakeCustomFieldsWorld(definedFields: Array<Record<string, unknown>> = []) {
  const fields: Array<Record<string, unknown>> = [...definedFields];
  fakeMembers([member({ name: 'Ada Lovelace' })]);
  const browseApi = fakeMemberCustomFields(() => fields);
  const uploadApi = fakeAdminEndpoint('POST', '/members/upload/', {
    meta: { stats: { imported: 1, invalid: [] }, import_label: { name: 'Import', slug: 'import' } },
  });
  const createApi = fakeAdminEndpoint('POST', '/members/metafields/custom/', ({ body }) => {
    const [input] = (body as { members_metafields: Array<{ name: string; type: string }> })
      .members_metafields;
    const field = {
      key: input.name.trim().toLowerCase().replace(/\s+/g, '-'),
      name: input.name.trim(),
      type: input.type,
      status: 'active',
      created_at: '2026-08-05T00:00:00.000Z',
      updated_at: null,
    };
    fields.push(field);
    return { members_metafields: [field] };
  });
  return { browseApi, createApi, uploadApi };
}

/** A field the site has already defined, for proving what an import does and does not offer. */
const NICKNAME_FIELD = {
  key: 'nickname',
  name: 'Nickname',
  type: 'short_text',
  status: 'active',
  created_at: '2026-08-05T00:00:00.000Z',
  updated_at: null,
};

/**
 * The mapping as it went over the wire: the upload is multipart, carrying one
 * `mapping[<column>]` field per column the request names.
 */
function sentMapping(body: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(body as Record<string, string>)
      .filter(([key]) => key.startsWith('mapping['))
      .map(([key, value]) => [key.slice('mapping['.length, -1), value]),
  );
}

async function openMappingStep(csv: string = CSV) {
  await membersScreen.openActionsMenu();
  await membersScreen.menuItem(/Import members/).click();

  await expect.element(importMembersScreen.dropzone()).toBeVisible();
  await importMembersScreen
    .fileInput()
    .upload(new File([csv], 'members.csv', { type: 'text/csv' }));
}

const fieldSelect = importMembersScreen.fieldSelect;
const createForm = importMembersScreen.createFieldForm;
const importToggle = importMembersScreen.importToggle;

async function openCreateForm(column: string) {
  await importToggle(column).click();
  await fieldSelect(column).click();
  await importMembersScreen.addCustomFieldOption().click();
}

describe('Import members custom fields', () => {
  it('creates a custom field for an unmatched column and maps the column onto it', async () => {
    const { createApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await importToggle('nickname').click();
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Select field');

    await fieldSelect('nickname').click();
    await importMembersScreen.addCustomFieldOption().click();

    const dialog = importMembersScreen.createFieldForm();
    await expect.element(dialog).toBeVisible();
    // Suggested from the column, so the common case is nothing to type — and focused, so
    // the uncommon case is typing over it. The picker is a modal popover whose focus trap
    // outlives its exit animation, and has twice pulled the focus back out of this form.
    await expect.element(dialog.getByLabelText('Name')).toHaveValue('Nickname');
    await expect.element(dialog.getByLabelText('Name')).toHaveFocus();
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect
      .poll(() => createApi.lastRequest?.body)
      .toEqual({
        members_metafields: [{ name: 'Nickname', type: 'short_text' }],
      });

    // The row carries the new field immediately, from the create response: the browse query
    // is invalidated but not awaited, so waiting for the refetch would leave the picker
    // blank in between.
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Nickname');
  });

  it('marks a custom field a membership field already has the name of', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await userEvent.fill(createForm().getByLabelText('Name'), 'Name');
    await createForm().getByRole('button', { name: 'Save' }).click();

    // Two rows read "Name" now, and the mark on the custom one is the whole of what tells
    // them apart once the list is closed. The membership field carries nothing: it is the
    // rule rather than the exception, and marking both is what this replaced.
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Name');
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Custom');
    await expect.element(fieldSelect('name')).toHaveTextContent('Name');
    await expect.element(fieldSelect('name')).not.toHaveTextContent('Custom');
  });

  it('leaves a custom field no membership field is named like unmarked', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await createForm().getByRole('button', { name: 'Save' }).click();

    await expect.element(fieldSelect('nickname')).toHaveTextContent('Nickname');
    await expect.element(fieldSelect('nickname')).not.toHaveTextContent('Custom');
  });

  it('selects the second of two fields sharing a name from the keyboard', async () => {
    const { uploadApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await userEvent.fill(createForm().getByLabelText('Name'), 'Name');
    await createForm().getByRole('button', { name: 'Save' }).click();
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Name');

    await importToggle('city').click();
    await fieldSelect('city').click();
    await userEvent.fill(importMembersScreen.searchFieldsInput(), 'Name');
    await expect(importMembersScreen.option('Name', { exact: true })).toHaveCount(2);

    // Highlighting and selecting have to agree about which of the two this is.
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await expect.element(fieldSelect('city')).toHaveTextContent('Custom');
    // A target belongs to one column at a time, so this is the custom field changing hands.
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Select field');

    await importToggle('nickname').click();
    await importMembersScreen.importButton(1).click();
    await expect
      .poll(() => uploadApi.lastRequest && sentMapping(uploadApi.lastRequest.body))
      .toEqual({
        email: 'email',
        name: 'name',
        nickname: '',
        city: 'custom_fields.name',
        postcode: '',
      });
  });

  it('searches the names on the rows rather than the columns behind them', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await createForm().getByRole('button', { name: 'Save' }).click();

    await fieldSelect('nickname').click();
    await userEvent.fill(importMembersScreen.searchFieldsInput(), 'custom');

    // Force-mounted, so it survives any search. Nothing else should: no field is "custom".
    await expect.element(importMembersScreen.addCustomFieldOption()).toBeVisible();
    await expect
      .element(importMembersScreen.option('Subscribed to emails'))
      .not.toBeInTheDocument();
    await expect.element(importMembersScreen.option('Nickname')).not.toBeInTheDocument();

    await userEvent.fill(importMembersScreen.searchFieldsInput(), 'nick');
    await expect.element(importMembersScreen.option('Nickname')).toBeVisible();
  });

  it('puts the create form away when another picker is opened', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await expect.element(createForm()).toBeVisible();

    // The publisher has moved on to another decision, and a half-filled form stranded
    // under someone else's dropdown helps nobody. `email` because a column out of the
    // import has no control to open.
    await fieldSelect('email').click();

    await expect.element(createForm()).not.toBeInTheDocument();
  });

  it('keeps its field when a column is deselected', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await importMembersScreen.createFieldForm().getByRole('button', { name: 'Save' }).click();
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Nickname');

    // Excluding a column from this import and choosing what it holds are different answers,
    // so switching it back on must not make the publisher pick again.
    await importToggle('nickname').click();
    await importToggle('nickname').click();

    await expect.element(fieldSelect('nickname')).toHaveTextContent('Nickname');
  });

  // A composite spans several columns, so the form has nothing to say about which one this
  // is. It creates the field and hands the question back to the picker, filtered to what it
  // just made — the same question as any other mapping, asked where the others are.
  it('creates a composite field and asks which part the column holds', async () => {
    const { createApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('city');

    const dialog = importMembersScreen.createFieldForm();
    await expect.element(dialog).toBeVisible();
    await userEvent.fill(dialog.getByLabelText('Name'), 'Shipping address');

    await dialog.getByRole('combobox', { name: 'Type' }).click();
    await importMembersScreen.option('Address').click();
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect
      .poll(() => createApi.lastRequest?.body)
      .toEqual({
        members_metafields: [{ name: 'Shipping address', type: 'address' }],
      });

    // The form is gone and its row's picker is open in its place, showing that field's
    // parts and nothing else — the search is what narrows it, so it can still be cleared.
    await expect.element(createForm()).not.toBeInTheDocument();
    await expect.element(importMembersScreen.option('Shipping address (City)')).toBeVisible();
    await expect
      .element(importMembersScreen.option('Email', { exact: true }))
      .not.toBeInTheDocument();

    await importMembersScreen.option('Shipping address (City)').click();

    // Mapped onto the part chosen, not the field's first column.
    await expect.element(fieldSelect('city')).toHaveTextContent('Shipping address (City)');
  });

  it('pins a name the site already uses to the name input', async () => {
    fakeCustomFieldsWorld();
    fakeAdminEndpoint(
      'POST',
      '/members/metafields/custom/',
      {
        errors: [
          {
            message: 'A custom field with this name already exists.',
            property: 'name',
            type: 'ValidationError',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await createForm().getByRole('button', { name: 'Save' }).click();

    // On the input they would fix, not in a corner: the clashing field may be archived,
    // which they cannot see from here.
    await expect
      .element(createForm().getByText('A custom field with this name already exists.'))
      .toBeVisible();
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Select field');
  });

  it('shows why the site cannot take another field, and stops offering to retry', async () => {
    fakeCustomFieldsWorld();
    fakeAdminEndpoint(
      'POST',
      '/members/metafields/custom/',
      {
        errors: [
          {
            // As Ghost serialises a host limit: a generic summary in `message`, the sentence
            // that explains the refusal in `context`.
            message: 'Cannot create custom field.',
            context:
              'Custom fields are limited to 20 per site. Delete a field you no longer need to make room.',
            code: 'CUSTOM_FIELDS_LIMIT_REACHED',
            type: 'HostLimitError',
          },
        ],
      },
      { status: 403 },
    );
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await createForm().getByRole('button', { name: 'Save' }).click();

    // The server's own sentence, because it is the only thing that explains the refusal.
    await expect.element(createForm().getByText(/limited to 20 per site/)).toBeVisible();
    // Retrying cannot succeed, so the button that invites it is disabled until they change
    // something.
    await expect.element(createForm().getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('says the field exists when the response carries nothing to map onto', async () => {
    fakeCustomFieldsWorld();
    // A 2xx the client cannot use: an older bundle against a newer server, a proxy that
    // reshapes the envelope. The field is created either way, so the form must not claim
    // otherwise and send them to create a second one.
    fakeAdminEndpoint('POST', '/members/metafields/custom/', { members_metafields: [] });
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('nickname');
    await createForm().getByRole('button', { name: 'Save' }).click();

    await expect
      .element(createForm().getByText(/was created, but this column could not be mapped/))
      .toBeVisible();
    await expect.element(fieldSelect('nickname')).toHaveTextContent('Select field');
  });

  // Leaving a column out of the mapping is how the importer is told to carry it through
  // under its own header, which for a custom_fields.* column means importing it. So a
  // deselected column has to be named with an empty target, not omitted.
  it('names every column it is not importing rather than omitting it', async () => {
    const { uploadApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    // `name` is auto-detected, so this deselects a column that has a field; the three
    // undetected columns are already out, having nothing to import them as.
    await importToggle('name').click();
    await importMembersScreen.importButton(1).click();

    await expect
      .poll(() => uploadApi.lastRequest && sentMapping(uploadApi.lastRequest.body))
      .toEqual({
        email: 'email',
        name: '',
        nickname: '',
        city: '',
        postcode: '',
      });
  });

  // Being deselected and having lost a target are separate facts, and the first outranks the
  // second. Losing a target puts a column back in the import so it cannot silently vanish
  // with nothing said — but a column the publisher already switched off asked to be out, and
  // it stays out. Collapsing the two into one in-or-out decision would resurrect it here.
  it('keeps a deselected column out when another column takes the field it held', async () => {
    const { uploadApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await importToggle('name').click();
    await expect.element(importToggle('name')).not.toBeChecked();

    // `nickname` claims Name, which `name` was auto-detected onto — so `name` loses its
    // target the way a switched-off column never asked to.
    await importToggle('nickname').click();
    await fieldSelect('nickname').click();
    await importMembersScreen.option('Name', { exact: true }).click();

    // Still out, and with nothing to show for it: a column out of the import has no field
    // control at all, so the target it lost cannot be read off the row either.
    await expect.element(importToggle('name')).not.toBeChecked();
    await expect.element(fieldSelect('name')).not.toBeInTheDocument();

    await importMembersScreen.importButton(1).click();
    await expect
      .poll(() => uploadApi.lastRequest && sentMapping(uploadApi.lastRequest.body))
      .toEqual({
        email: 'email',
        name: '',
        nickname: 'name',
        city: '',
        postcode: '',
      });
  });

  // The columns a publisher can see are the columns they can exclude, and a column the mapping
  // never names is carried through by the importer rather than left out. So a short row must
  // not be able to hide one: everything the header declares has to reach the table and the
  // request, whichever sample happens to be on screen.
  it('shows every column the file has, not just the previewed row', async () => {
    const { uploadApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep(RAGGED_CSV);

    // Row 1 holds only an email, so reading columns off it would leave these two off the
    // table with no way to say anything about them.
    await expect.element(importToggle('name')).toBeVisible();
    await expect.element(importToggle('note')).toBeVisible();

    // Detected too, not merely displayed: a column the publisher has to map by hand because
    // an earlier row was short is barely better than one they never saw.
    await expect.element(fieldSelect('name')).toHaveTextContent('Name');
    await expect.element(fieldSelect('note')).toHaveTextContent('Note');

    await importToggle('note').click();
    await importMembersScreen.importButton(2).click();

    // Named and emptied, not omitted — omitting it is how the importer is told to keep it.
    await expect
      .poll(() => uploadApi.lastRequest && sentMapping(uploadApi.lastRequest.body))
      .toEqual({
        email: 'email',
        name: 'name',
        note: '',
      });
  });

  // The upload result and its refusals are re-implemented in this modal, so they are asserted
  // here rather than inherited: the shipped modal's own suite covers the file the gate no
  // longer serves when the flag is on.
  describe('after the upload', () => {
    async function importAll() {
      await renderAdminApp('/members', FLAGS);
      await openMappingStep();
      await importMembersScreen.importButton(1).click();
    }

    it('shows the result when the import completes', async () => {
      fakeCustomFieldsWorld();
      await importAll();

      await expect.element(importMembersScreen.importCompleteText()).toBeVisible();
    });

    it('says the file was too large rather than blaming the data', async () => {
      fakeCustomFieldsWorld();
      fakeAdminEndpoint(
        'POST',
        '/members/upload/',
        { errors: [{ message: 'too big' }] },
        { status: 413 },
      );
      await importAll();

      await expect
        .element(importMembersScreen.messageText(/larger than the maximum file size/))
        .toBeVisible();
    });

    it('shows the host limit refusal and does not offer to try again', async () => {
      fakeCustomFieldsWorld();
      fakeAdminEndpoint(
        'POST',
        '/members/upload/',
        {
          errors: [
            {
              // As Ghost serialises it: generic summary in `message`, the sentence that
              // explains the refusal in `context`.
              message: 'Cannot import members.',
              context: 'Woah there, that is a lot of members.',
              code: 'EMAIL_VERIFICATION_NEEDED',
              type: 'HostLimitError',
            },
          ],
        },
        { status: 403 },
      );
      await importAll();

      // The server's own sentence, and no retry: nothing the publisher can do here changes
      // a limit, so a button inviting them to repeat the request would only mislead.
      await expect
        .element(importMembersScreen.messageText(/that is a lot of members/))
        .toBeVisible();
      await expect.element(importMembersScreen.tryAgainButton()).not.toBeInTheDocument();
    });

    it('shows what the server refused about the data', async () => {
      fakeCustomFieldsWorld();
      fakeAdminEndpoint(
        'POST',
        '/members/upload/',
        {
          errors: [{ message: 'The file has no email column.', type: 'DataImportError' }],
        },
        { status: 422 },
      );
      await importAll();

      await expect
        .element(importMembersScreen.messageText('The file has no email column.'))
        .toBeVisible();
    });
  });

  // A query whose only job is to add targets to a list must not be able to stop the import.
  it('imports with membership fields when custom fields cannot be loaded', async () => {
    fakeMembers([member({ name: 'Ada Lovelace' })]);
    fakeAdminEndpoint(
      'GET',
      customFieldsBrowsePath,
      { errors: [{ message: 'nope' }] },
      { status: 500 },
    );
    const uploadApi = fakeAdminEndpoint('POST', '/members/upload/', {
      meta: {
        stats: { imported: 1, invalid: [] },
        import_label: { name: 'Import', slug: 'import' },
      },
    });
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    // The table is reached at all — waiting on a failed query would leave it on a spinner.
    await expect.element(fieldSelect('email')).toHaveTextContent('Email');
    await importMembersScreen.importButton(1).click();

    await expect
      .poll(() => uploadApi.lastRequest && sentMapping(uploadApi.lastRequest.body))
      .toMatchObject({
        email: 'email',
      });
  });

  it('clears a refusal when the column it named is answered by creating a field', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    // Refused: in the import with nothing chosen for it.
    await importToggle('nickname').click();
    await importMembersScreen.importButton(1).click();
    await expect
      .element(importMembersScreen.messageText(/Choose a field for "nickname"/))
      .toBeVisible();
    await expect.element(fieldSelect('nickname')).toHaveAttribute('aria-invalid', 'true');

    // Creating one is that question answered, so the refusal goes with it.
    await fieldSelect('nickname').click();
    await importMembersScreen.addCustomFieldOption().click();
    await createForm().getByRole('button', { name: 'Save' }).click();

    await expect
      .element(importMembersScreen.messageText(/Choose a field for/))
      .not.toBeInTheDocument();
    await expect.element(fieldSelect('nickname')).not.toHaveAttribute('aria-invalid');
  });

  it('will not import a file whose email column is deselected', async () => {
    const { uploadApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    // Mapped, but out of the import. The request would go without an email column and
    // every row would come back missing one.
    await importToggle('email').click();
    await importMembersScreen.importButton(1).click();

    await expect.element(importMembersScreen.messageText(/make sure it is selected/)).toBeVisible();
    expect(uploadApi.requests).toHaveLength(0);
  });

  it('marks the column it cannot import a selected row as, and lets it through once answered', async () => {
    const { uploadApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await importToggle('nickname').click();
    await importMembersScreen.importButton(1).click();

    // On the row that has to change, not only in prose: the offending column may have
    // scrolled out of view by the time the message is read.
    await expect
      .element(importMembersScreen.messageText(/Choose a field for "nickname"/))
      .toBeVisible();
    await expect.element(fieldSelect('nickname')).toHaveAttribute('aria-invalid', 'true');
    expect(uploadApi.requests).toHaveLength(0);

    await fieldSelect('nickname').click();
    await importMembersScreen.option('Note').click();
    await expect.element(fieldSelect('nickname')).not.toHaveAttribute('aria-invalid');

    await importMembersScreen.importButton(1).click();
    await expect
      .poll(() => uploadApi.lastRequest && sentMapping(uploadApi.lastRequest.body))
      .toMatchObject({
        nickname: 'note',
      });
  });

  // The whole point of one list: what a column can be imported as is answered by reading it,
  // not by switching a kind picker to find out what is behind each setting.
  it('offers membership and custom fields in one searchable list', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep(EXPORTED_CSV);

    // A Ghost export re-imported where its field no longer exists: nothing matches, so it
    // starts out of the import with nothing chosen for it.
    await importToggle('custom_fields.nickname').click();
    await expect.element(fieldSelect('custom_fields.nickname')).toHaveTextContent('Select field');
    await fieldSelect('custom_fields.nickname').click();

    // Both kinds are reachable from the one list, without choosing between them first.
    // Exact, or "Email" also matches "Subscribed to emails".
    await expect.element(importMembersScreen.option('Email', { exact: true })).toBeVisible();
    await expect.element(importMembersScreen.addCustomFieldOption()).toBeVisible();

    // And searchable, which is what makes the member fields usable as one list rather than
    // two — there are ten of them before a site defines a single custom field.
    await userEvent.fill(importMembersScreen.searchFieldsInput(), 'stripe');
    await expect.element(importMembersScreen.option('Stripe Customer ID')).toBeVisible();
    await expect
      .element(importMembersScreen.option('Email', { exact: true }))
      .not.toBeInTheDocument();
  });

  // A search matching no field is the strongest signal there is that the field wanted does not
  // exist yet, so the way to make one has to survive the search that proves it.
  it('offers to add a field when the search matches none', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await importToggle('nickname').click();
    await fieldSelect('nickname').click();
    await userEvent.fill(importMembersScreen.searchFieldsInput(), 'zzzz');

    await expect
      .element(importMembersScreen.option('Email', { exact: true }))
      .not.toBeInTheDocument();
    await importMembersScreen.addCustomFieldOption().click();

    await expect.element(createForm()).toBeVisible();
  });

  // The part is chosen in the picker now, so it can be left unchosen — which the form's old
  // guard made impossible. The column is in the import with nothing to fill, and Import says so.
  it('refuses the import when a composite is created and no part is chosen', async () => {
    const { uploadApi } = fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await openCreateForm('city');
    await userEvent.fill(createForm().getByLabelText('Name'), 'Shipping address');
    await createForm().getByRole('combobox', { name: 'Type' }).click();
    await importMembersScreen.option('Address').click();
    await createForm().getByRole('button', { name: 'Save' }).click();

    // Dismissed without answering which part the column holds.
    await expect.element(importMembersScreen.option('Shipping address (City)')).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await importMembersScreen.importButton(1).click();
    await expect
      .element(importMembersScreen.messageText(/Choose a field for "city"/))
      .toBeVisible();
    expect(uploadApi.requests).toHaveLength(0);
  });

  // Dismissing is left alone — it is how a dialog is closed — but it must not silently discard
  // a mapping. Nothing has been changed here, so there is nothing to lose and nothing to ask.
  it('closes without asking when nothing has been changed', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();
    await expect.element(fieldSelect('email')).toBeVisible();

    await userEvent.keyboard('{Escape}');

    await expect.element(importMembersScreen.leaveConfirmationText()).not.toBeInTheDocument();
    await expect.element(fieldSelect('email')).not.toBeInTheDocument();
  });

  it('asks before discarding a mapping that has been changed', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();

    await importToggle('nickname').click();
    await userEvent.keyboard('{Escape}');

    // Keeping goes back to exactly where they were, with the change intact.
    await expect.element(importMembersScreen.leaveConfirmationText()).toBeVisible();
    await importMembersScreen.keepMappingButton().click();
    await expect.element(fieldSelect('email')).toBeVisible();
    await expect.element(importToggle('nickname')).toBeChecked();

    await userEvent.keyboard('{Escape}');
    await importMembersScreen.leaveButton().click();
    await expect.element(fieldSelect('email')).not.toBeInTheDocument();
  });

  // Fire both DOM events in one task to cover Escape arriving before React commits the edit.
  // userEvent adds task boundaries that let React settle and hide this race.
  it('asks even when the dismissal lands before React has settled', async () => {
    fakeCustomFieldsWorld();
    await renderAdminApp('/members', FLAGS);
    await openMappingStep();
    await expect.element(fieldSelect('email')).toBeVisible();

    const toggle = importToggle('nickname').element() as HTMLElement;
    toggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect.element(importMembersScreen.leaveConfirmationText()).toBeVisible();
  });

  describe('without field management', () => {
    it('offers the defined fields, but no way to make another', async () => {
      const { browseApi } = fakeCustomFieldsWorld([NICKNAME_FIELD]);
      await renderAdminApp('/members', WITHOUT_CUSTOM_FIELDS);
      await openMappingStep();

      await importToggle('nickname').click();
      await fieldSelect('nickname').click();

      // Exact, or "Email" also matches "Subscribed to emails".
      await expect.element(importMembersScreen.option('Email', { exact: true })).toBeVisible();
      await expect.element(importMembersScreen.option('Nickname')).toBeVisible();
      await expect.element(importMembersScreen.addCustomFieldOption()).not.toBeInTheDocument();

      expect(browseApi.requests.length).toBeGreaterThan(0);
    });

    it('says no field matches a search rather than offering to make one', async () => {
      fakeCustomFieldsWorld();
      await renderAdminApp('/members', WITHOUT_CUSTOM_FIELDS);
      await openMappingStep();

      await importToggle('nickname').click();
      await fieldSelect('nickname').click();
      await userEvent.fill(importMembersScreen.searchFieldsInput(), 'zzzz');

      // The offer to add a field was the list's only force-mounted item, so without it a
      // fruitless search would leave the list blank with nothing said.
      await expect.element(importMembersScreen.addCustomFieldOption()).not.toBeInTheDocument();
      await expect.element(importMembersScreen.messageText('No fields found.')).toBeVisible();
    });
  });
});
