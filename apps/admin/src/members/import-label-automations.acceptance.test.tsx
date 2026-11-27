import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { HttpResponse } from 'msw';
import {
  automation,
  fakeAdminEndpoint,
  fakeLabelAutomations,
  fakeMembers,
  label,
  member,
  renderAdminApp,
  settleAnimations,
} from '@test-utils/acceptance';
import { deferred } from '@/utils/deferred';
import { importMembersScreen as imports } from './import-members.screen';

const flags = { automations: true, automationsLeadMagnets: true };
const button = (name: string) => imports.dialog().getByRole('button', { name, exact: true });
const success = {
  meta: { stats: { imported: 1, invalid: [] }, import_label: { name: 'Import', slug: 'import' } },
};

function setup() {
  const vip = label({ name: 'VIP' });
  const guide = label({ name: 'Guide' });
  fakeMembers([member({ name: 'Existing member' })], { labels: [vip, guide] });
  const first = automation({ name: 'VIP welcome', status: 'active' });
  const second = automation({ name: 'VIP follow-up', status: 'active' });
  const third = automation({ name: 'Guide delivery', status: 'active' });
  fakeLabelAutomations([
    { automation: first, label: vip },
    { automation: second, label: vip },
    { automation: third, label: guide },
  ]);
  const upload = fakeAdminEndpoint('POST', '/members/upload/', success);
  return { vip, guide, upload };
}

async function openMapping(csv: string) {
  await renderAdminApp('/members/import', { labs: flags });
  await expect.element(imports.dropzone()).toBeVisible();
  await imports.fileInput().upload(new File([csv], 'members.csv', { type: 'text/csv' }));
  await expect.element(imports.fieldSelect('email')).toBeVisible();
  await settleAnimations(imports.dialog().element());
}

async function pickVip() {
  await imports.dialog().getByRole('combobox', { name: 'Search labels...' }).click();
  await imports
    .dialog()
    .getByRole('option', { name: /^VIP\s/ })
    .click();
  await imports.dialog().getByRole('heading').click();
}

async function confirmOne() {
  await expect.element(imports.importButton(1)).toBeEnabled();
  await imports.importButton(1).click();
  await expect.element(button('Back')).toBeVisible();
}

describe('Import label automation confirmation', () => {
  it('confirms picker labels after validation and preserves choices on Back', async () => {
    const { upload } = setup();
    await openMapping('email,note\nada@example.com,Keep this\n');
    await imports.importToggle('note').click();
    await pickVip();
    await confirmOne();
    await expect
      .element(imports.dialog())
      .toHaveTextContent(
        'Importing also starts the VIP welcome and VIP follow-up automations for members labeled VIP.',
      );
    expect(upload.requests).toHaveLength(0);
    await button('Back').click();
    await expect.element(button('Remove VIP')).toBeVisible();
    await expect.element(imports.importToggle('note')).not.toBeChecked();
    await expect.element(imports.fieldSelect('email')).toHaveTextContent('Email');
    await confirmOne();
    await imports.importButton(1).click();
    await expect.element(imports.importCompleteText()).toBeVisible();
    expect(upload.requests).toHaveLength(1);
    expect(upload.lastRequest?.body).toMatchObject({ 'mapping[note]': '', labels: 'VIP' });
  });

  it('finds multiple affected labels from CSV values and deduplicates them across rows', async () => {
    const { upload } = setup();
    await openMapping(
      'email,labels\nada@example.com," VIP, Guide "\nbea@example.com,"vip,Guide,Unknown"\n',
    );
    await expect.element(imports.importButton(2)).toBeEnabled();
    await imports.importButton(2).click();
    await expect
      .element(imports.dialog())
      .toHaveTextContent('Importing also starts 3 automations for these members.');
    await expect.element(imports.dialog()).toHaveTextContent('Starts VIP welcome');
    await expect.element(imports.dialog()).toHaveTextContent('Starts Guide delivery');
    expect(upload.requests).toHaveLength(0);
  });

  it('deduplicates the same affected label from the picker and CSV', async () => {
    const { upload } = setup();
    await openMapping('email,labels\nada@example.com,"vip, VIP"\n');
    await pickVip();
    await confirmOne();
    await expect
      .element(imports.dialog())
      .toHaveTextContent(
        'Importing also starts the VIP welcome and VIP follow-up automations for members labeled VIP.',
      );
    await expect.element(imports.dialog()).not.toHaveTextContent('starts 4 automations');
    expect(upload.requests).toHaveLength(0);
  });

  it('imports directly with unrelated labels', async () => {
    const { upload } = setup();
    await openMapping('email,labels\nada@example.com,Other\n');
    await expect.element(imports.importButton(1)).toBeEnabled();
    await imports.importButton(1).click();
    await expect.element(imports.importCompleteText()).toBeVisible();
    expect(upload.requests).toHaveLength(1);
  });

  it('blocks importing when the automation browse endpoint returns 404', async () => {
    const { upload } = setup();
    fakeAdminEndpoint('GET', '/automations/', {}, { status: 404 });
    await openMapping('email,labels\nada@example.com,VIP\n');
    await expect.element(imports.importButton(1)).toBeEnabled();
    await imports.importButton(1).click();
    await expect
      .element(
        page.getByText('Something went wrong while loading automations, please try again.', {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect.element(imports.importButton(1)).toBeEnabled();
    expect(upload.requests).toHaveLength(0);
  });

  it.each(['exclude', 'remap'] as const)(
    'does not warn for a CSV label column after %s',
    async (change) => {
      const { upload } = setup();
      await openMapping('email,labels\nada@example.com,VIP\n');
      if (change === 'exclude') {
        await imports.importToggle('labels').click();
      } else {
        await imports.fieldSelect('labels').click();
        await imports.option('Note', { exact: true }).click();
      }
      await expect.element(imports.importButton(1)).toBeEnabled();
      await imports.importButton(1).click();
      await expect.element(imports.importCompleteText()).toBeVisible();
      expect(upload.requests).toHaveLength(1);
      expect(upload.lastRequest?.body).toMatchObject({
        'mapping[labels]': change === 'exclude' ? '' : 'note',
      });
    },
  );

  it('keeps invalid mappings on the mapping screen before asking about automations', async () => {
    const { upload } = setup();
    await openMapping('email,labels\nada@example.com,VIP\n');
    await imports.importToggle('email').click();
    await imports.importButton(1).click();
    await expect.element(imports.messageText(/make sure it is selected/)).toBeVisible();
    await expect.element(button('Back')).not.toBeInTheDocument();
    expect(upload.requests).toHaveLength(0);
  });

  it('blocks an unreadable CSV label lookup and retries before confirming', async () => {
    const { vip, upload } = setup();
    fakeAdminEndpoint(
      'GET',
      `/labels/${vip.id}/`,
      { errors: [{ message: 'Unavailable' }] },
      { status: 422 },
    );
    await openMapping('email,labels\nada@example.com,VIP\n');
    await expect.element(imports.importButton(1)).toBeEnabled();
    await imports.importButton(1).click();
    await expect.element(page.getByText('Unavailable', { exact: true })).toBeVisible();
    expect(upload.requests).toHaveLength(0);
    fakeAdminEndpoint('GET', `/labels/${vip.id}/`, { labels: [vip] });
    await confirmOne();
  });

  it('refreshes CSV matching after renaming an active trigger label in the picker', async () => {
    const { vip, upload } = setup();
    fakeAdminEndpoint('PUT', `/labels/${vip.id}/`, () => {
      vip.name = 'Renamed VIP';
      return { labels: [vip] };
    });
    await openMapping('email,labels\nada@example.com,VIP\n');
    await confirmOne();
    await button('Back').click();
    await imports.dialog().getByRole('combobox', { name: 'Search labels...' }).click();
    await button('Edit label VIP').click();
    await imports.dialog().getByRole('textbox').fill('Renamed VIP');
    await button('Save').click();
    await expect.element(button('Save')).not.toBeInTheDocument();
    await imports.dialog().getByRole('heading').click();
    await expect.element(imports.importButton(1)).toBeEnabled();
    await imports.importButton(1).click();
    await expect.element(imports.importCompleteText()).toBeVisible();
    expect(upload.requests).toHaveLength(1);
  });

  it('submits once after confirmation and keeps the existing upload/error handling', async () => {
    setup();
    const response = deferred<Response>();
    const upload = fakeAdminEndpoint('POST', '/members/upload/', () => response.promise);
    await openMapping('email,labels\nada@example.com,Guide\n');
    await confirmOne();
    await imports.importButton(1).click();
    await expect.element(imports.importButton(1)).toBeDisabled();
    await expect.element(button('Back')).toBeDisabled();
    await expect
      .element(imports.dialog())
      .toHaveTextContent(
        'Importing also starts the Guide delivery automation for members labeled Guide.',
      );
    await expect.poll(() => upload.requests.length).toBe(1);
    response.resolve(
      HttpResponse.json(
        { errors: [{ message: 'The import was refused.', type: 'DataImportError' }] },
        { status: 400 },
      ),
    );
    await expect.element(imports.messageText('The import was refused.')).toBeVisible();
    expect(upload.requests).toHaveLength(1);
  });

  it.each([999, 1000])(
    'bases the processing warning on %i affected rows in a 1,000-row CSV',
    async (affectedRows) => {
      setup();
      const rows = Array.from({ length: 1000 }, (_, index) => {
        const name = index < affectedRows ? 'Guide' : 'Unrelated';
        return `reader${index}@example.com,${name}`;
      });
      await openMapping(`email,labels\n${rows.join('\n')}\n`);
      await expect.element(button('Import 1,000 members')).toBeEnabled();
      await button('Import 1,000 members').click();
      await expect.element(button('Back')).toBeVisible();
      const warning = imports.dialog().getByText(/Large imports can take longer to process/);
      if (affectedRows === 1000) {
        await expect.element(warning).toBeVisible();
      } else {
        await expect.element(warning).not.toBeInTheDocument();
      }
    },
  );
});
