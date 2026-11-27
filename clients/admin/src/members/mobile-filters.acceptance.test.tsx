import { afterEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  fakeMembers,
  fakeSegmentWrites,
  member,
  label,
  tier,
  renderAdminApp,
} from '@test-utils/acceptance';

afterEach(async () => {
  await page.viewport(1280, 800);
});
it.each([320, 390, 820])('edits mobile filters in one sheet at %i', async (width) => {
  await page.viewport(width, 844);
  const api = fakeMembers([member({ name: 'Alice' })]);
  await renderAdminApp('/members', { labs: { admin7Mobile: true, admin7Design: false } });
  await expect.element(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await expect.element(sheet).toBeVisible();
  await expect.element(page.getByRole('option', { name: 'Name', exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'Name', exact: true }).click();
  await expect.element(sheet).toBeVisible();
  await page.getByRole('textbox', { name: 'Enter name...', exact: true }).fill('Alice');
  await expect(api).toHaveSentFilter("name:~'Alice'");
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  await page.getByRole('option', { name: 'Email', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Enter email...', exact: true })
    .fill('a-very-long-email-address@example.com');
  expect(sheet.element().scrollWidth).toBe(sheet.element().clientWidth);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit active filters', exact: true }).click();
  await expect
    .element(page.getByRole('textbox', { name: 'Enter name...', exact: true }))
    .toHaveValue('Alice');
  await page.getByRole('button', { name: 'Remove filter', exact: true }).first().click();
  await expect(page.getByRole('textbox', { name: 'Enter name...', exact: true })).toHaveCount(0);
  await expect
    .element(page.getByRole('textbox', { name: 'Enter email...', exact: true }))
    .toHaveValue('a-very-long-email-address@example.com');
  await expect(sheet.getByRole('button', { name: 'Clear all', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit active filters' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(sheet).toHaveCount(1);
  await expect.element(page.getByRole('option', { name: 'Name', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Enter name...', exact: true })).toHaveCount(0);
});

it('adds a choice and date filter, saves a view, and keeps filters when resizing', async () => {
  await page.viewport(390, 844);
  fakeMembers([member({ name: 'Alice' })]);
  const segmentsApi = fakeSegmentWrites();
  await renderAdminApp('/members', { labs: { admin7Mobile: true, admin7Design: false } });
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('option', { name: 'Member status', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect.element(page.getByRole('option', { name: 'Name', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  await page.getByRole('option', { name: 'Member status', exact: true }).click();
  await page.getByRole('option', { name: 'Free', exact: true }).click();
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  await page.getByRole('option', { name: 'Created', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  expect(sheet.element().scrollWidth).toBe(sheet.element().clientWidth);
  await page.getByRole('button', { name: 'Save view', exact: true }).click();
  await page.getByPlaceholder('View name').fill('Mobile sync');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(() => segmentsApi.requests)
    .toMatchObject([
      {
        method: 'POST',
        path: '/segments/',
        body: { segments: [{ name: 'Mobile sync' }] },
      },
    ]);
  await expect.element(sheet).toBeVisible();
  await page.viewport(1280, 800);
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filters, 2 active', exact: true })).toHaveCount(0);
  await expect.poll(() => document.querySelectorAll('[data-slot=filter-item]').length).toBe(2);
});

it('keeps the existing picker when the flag is off', async () => {
  await page.viewport(390, 844);
  fakeMembers([member()]);
  await renderAdminApp('/members', { labs: { admin7Mobile: false, admin7Design: false } });
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect.element(page.getByRole('option', { name: 'Name', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Filters', exact: true })).toHaveCount(0);
});

it('searches fields and selects with the keyboard', async () => {
  await page.viewport(390, 844);
  fakeMembers([member()]);
  await renderAdminApp('/members', { labs: { admin7Mobile: true, admin7Design: false } });
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByPlaceholder('Search fields...').fill('Name');
  await expect.element(page.getByRole('option', { name: 'Name', exact: true })).toBeVisible();
  await userEvent.keyboard('{Home}{Enter}');
  await expect
    .element(page.getByRole('textbox', { name: 'Enter name...', exact: true }))
    .toBeVisible();
});

it('resolves tier and label chip values without opening the sheet', async () => {
  await page.viewport(390, 844);
  const gold = tier({ name: 'Gold membership', slug: 'gold-membership' });
  const silver = tier({ name: 'Silver membership', slug: 'silver-membership' });
  const vip = label({ name: 'VIP readers', slug: 'vip-readers' });
  fakeMembers([member({ labels: [vip] })], { tiers: [gold, silver] });
  const filter = `tier_id:[${gold.id}]+label:[${vip.slug}]`;
  await renderAdminApp(`/members?filter=${encodeURIComponent(filter)}`, {
    labs: { admin7Mobile: true, admin7Design: false },
  });
  const summary = page.getByRole('button', { name: 'Edit active filters', exact: true });
  await expect.element(summary).toHaveTextContent('Gold membership');
  await expect.element(summary).toHaveTextContent('VIP readers');
  await expect(page.getByRole('dialog', { name: 'Filters', exact: true })).toHaveCount(0);
  await summary.click();
  await page.getByRole('button', { name: 'Gold membership', exact: true }).click();
  await page.getByRole('option', { name: /Silver membership/ }).click();
  await userEvent.keyboard('{Escape}');
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await sheet.getByRole('button', { name: 'Close', exact: true }).click();
  await expect.element(summary).toHaveTextContent('Silver membership');
});
