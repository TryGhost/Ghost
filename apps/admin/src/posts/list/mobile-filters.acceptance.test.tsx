import { afterEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  fakePosts,
  fakePostsListScreen,
  fakeComments,
  renderAdminApp,
} from '@test-utils/acceptance';
import { clearStickyPostFilters } from '@/posts/list/posts-sticky-filters';

afterEach(async () => {
  clearStickyPostFilters();
  await page.viewport(1280, 800);
});

it.each([390, 820])('keeps Posts actions and filter rows usable at %i', async (width) => {
  await page.viewport(width, 844);
  fakePostsListScreen();
  fakePosts([]);
  await renderAdminApp('/posts?type=draft&visibility=members', {
    labs: { admin7Mobile: true, admin7Design: false },
  });
  await expect
    .element(page.getByRole('button', { name: 'Edit active filters', exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Filters, 2 active', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await expect.element(sheet).toBeVisible();
  await expect.element(sheet.getByRole('button', { name: 'Save view', exact: true })).toBeVisible();
  expect(sheet.element().scrollWidth).toBe(sheet.element().clientWidth);
  await sheet.getByRole('button', { name: 'Save view', exact: true }).click();
  await expect.element(page.getByPlaceholder('Name this view')).toBeVisible();
});

it('opens and closes the Comments filter sheet with F', async () => {
  await page.viewport(390, 844);
  fakeComments([]);
  await renderAdminApp('/comments', { labs: { admin7Mobile: true, admin7Design: false } });
  await expect.element(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
  await userEvent.keyboard('f');
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await expect.element(sheet).toBeVisible();
  await userEvent.keyboard('f');
  await expect(sheet).toHaveCount(0);
  await userEvent.keyboard('f');
  await page.getByRole('option', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'Published', exact: true }).click();
  await expect.element(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close', exact: true }).click();
  await expect
    .element(page.getByRole('button', { name: 'Filters, 1 active', exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Edit active filters', exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit active filters', exact: true })).toHaveCount(
    0,
  );
});
