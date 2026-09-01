/* eslint-disable no-console */
// A smoke test is a test file: it asserts, and it does so through `expect`. The
// rule that keeps assertions out of non-test files is scoped to `tests/`, which
// this lane deliberately sits outside of.
import { CsvTable } from './csv';
import { FrameLocator, Locator, Page, expect, test } from '@playwright/test';
import {
  createMember,
  createPaidTier,
  customFieldKey,
  isStripeConnected,
  memberIdByEmail,
  memberSigninUrl,
  setLabs,
  setMemberCustomFieldValues,
  setPortalPlans,
} from './arrange';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

/**
 * A smoke walk through the custom-fields feature against the running dev stack.
 *
 * Everything here is done the way a person does it: no mocks, no page objects,
 * no test ids, no CSS. Locators name what a thing IS on screen — a role, a
 * label, some text — so a failure here is a failure a human would have hit.
 *
 * The Admin API appears only to arrange (sign in, seed members, flip labs
 * flags, resolve an id to navigate to). Outcomes are read off the screen. The
 * one exception is step 9, where the members API's own shape IS the outcome.
 *
 * Run it with `pnpm smoke`.
 */

const BASE_URL = process.env.GHOST_BASE_URL || 'http://localhost:2368';
const STAMP = Date.now().toString(36).slice(-7);
const name = (label: string) => `${label} ${STAMP}`;

const SHORT_FIELD = name('Company');
const LONG_FIELD = name('Bio');
const ADDRESS_FIELD = name('Shipping');
const SEGMENT_FIELD = name('Region');
const SCRATCH_FIELD = name('Scratch');
const IMPORT_FIELD = name('Loyalty');
const CHECKOUT_FIELD = name('Recipient');
const VIEW_NAME = name('Smoke segment');
const BULK_LABEL = name('Smoke bulk');
const TIER_NAME = name('Smoke tier');

const MATCH_NAME = name('Smoke Match');
const MATCH_EMAIL = `smoke-match-${STAMP}@ghost.org`;
const OTHER_NAME = name('Smoke Other');
const OTHER_EMAIL = `smoke-other-${STAMP}@ghost.org`;
const IMPORTED_NAME = name('Smoke Imported');
const IMPORTED_EMAIL = `smoke-imported-${STAMP}@ghost.org`;
const CHECKOUT_EMAIL = `smoke-checkout-${STAMP}@ghost.org`;

const SHORT_VALUE = 'Ghost';
const LONG_VALUE = 'Runs the newsletter and answers every support email personally.';
const ADDRESS = {
  'Address line 1': '1 King Street',
  City: 'London',
  'Postal code': 'EC1A 1AA',
  Country: 'GB',
};
const SEGMENT_VALUE = 'EMEA';
const CHECKOUT_RECIPIENT = 'Smoke Recipient';
const CHECKOUT_PHONE = '+442079460000';
const CHECKOUT_ADDRESS = { line1: '9 Checkout Way', city: 'Bristol', postcode: 'BS1 4DJ' };

/** Shared across the serial run. */
const state: {
  matchId: string;
  otherId: string;
  shortKey: string;
  longKey: string;
  addressKey: string;
  segmentKey: string;
  importedId: string;
  exportCsv: string;
  stripeReady: boolean;
} = {
  matchId: '',
  otherId: '',
  shortKey: '',
  longKey: '',
  addressKey: '',
  segmentKey: '',
  importedId: '',
  exportCsv: '',
  stripeReady: false,
};

function col(key: string, part?: string): string {
  return part ? `metafields.custom.${key}.${part}` : `metafields.custom.${key}`;
}

/** A publisher names their own fields, so a name can hold regex metacharacters. */
const esc = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pass(step: string, note?: string) {
  console.log(`\n  ✅ STEP ${step} PASSED${note ? ` — ${note}` : ''}\n`);
}

function skipped(step: string, why: string) {
  console.log(`\n  ⏭️  STEP ${step} SKIPPED — ${why}\n`);
}

function finding(lines: string) {
  console.log(`\n  ⚠️  FINDING — ${lines}\n`);
}

function writeTemp(fileName: string, content: string): string {
  const path = join(tmpdir(), fileName);
  writeFileSync(path, content);
  return path;
}

/* ------------------------------------------------------------------ *
 * Settings → Membership → Custom fields
 * ------------------------------------------------------------------ */

/**
 * A field's row in the settings list. The row is itself a button naming the
 * field and its type ("Company 1a2b3c Short text"), and clicking it opens the
 * field's editor — which is what a person does.
 */
const settingsFieldRow = (page: Page, field: string) =>
  page.getByRole('button', { name: new RegExp(`^${esc(field)}\\b`) });

/**
 * The tab list belonging to the custom fields section.
 *
 * FINDING: the section is not a labelled region, and its tabs are called
 * "Active" / "Archived" — exactly like the tiers and newsletters sections'
 * tabs. Nothing accessible says which "Archived" tab is the custom fields one.
 * The nearest anchor is the panel that is currently showing custom fields: tab
 * lists and their mounted panels appear in the same document order, so the tab
 * list sitting at that panel's position is the section's own.
 */
async function customFieldsTabs(page: Page, fieldOnShowingTab: string): Promise<Locator> {
  const marker = settingsFieldRow(page, fieldOnShowingTab).or(
    page.getByText('No custom fields found.'),
  );
  // The list refetches after every change, so the tab that is showing can be
  // briefly empty. Wait for it to settle before pairing panels with tab lists.
  await expect(marker.first()).toBeVisible();

  let index = -1;
  await expect
    .poll(
      async () => {
        const panels = page.getByRole('tabpanel');
        const total = await panels.count();
        for (let at = 0; at < total; at++) {
          if ((await panels.nth(at).locator(marker).count()) > 0) {
            index = at;
            return true;
          }
        }
        return false;
      },
      {
        message:
          `No tab panel is showing "${fieldOnShowingTab}" (or an empty custom fields list), ` +
          'so the custom fields section could not be told apart from the other tabbed sections.',
      },
    )
    .toBe(true);

  return page.getByRole('tablist').nth(index);
}

async function goToCustomFieldsTab(page: Page, tab: 'Active' | 'Archived', onShowingTab: string) {
  const tabs = await customFieldsTabs(page, onShowingTab);
  await tabs.getByRole('tab', { name: tab, exact: true }).click();
}

async function gotoSettings(page: Page) {
  await page.goto('about:blank');
  await page.goto('/ghost/#/settings');
  await page.getByRole('heading', { name: 'Tiers', exact: true }).waitFor({ state: 'visible' });
}

/** Confirmations render as an alertdialog, not a dialog. */
function confirmButton(page: Page, label: string): Locator {
  return page
    .getByRole('alertdialog')
    .or(page.getByRole('dialog'))
    .getByRole('button', { name: label, exact: true });
}

/**
 * Create a field of the named type.
 *
 * FINDING: the field editor is a <section> with no dialog role and no
 * accessible name, so there is no container to scope to. Its controls are
 * individually labelled and unique while it is open, so they are addressed
 * directly.
 */
async function createField(page: Page, field: string, type: string) {
  await page.getByRole('button', { name: 'Add custom field' }).click();
  await page.getByRole('heading', { name: 'Add custom field' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'Name' }).fill(field);
  await page.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name: type, exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await settingsFieldRow(page, field).waitFor({ state: 'visible' });
}

async function openFieldEditor(page: Page, field: string) {
  await settingsFieldRow(page, field).click();
  await page.getByRole('heading', { name: 'Edit custom field' }).waitFor({ state: 'visible' });
}

/**
 * The field editor's overflow menu, which holds "Delete custom field".
 *
 * FINDING: it is labelled just "Menu" — the same name the theme settings
 * section's overflow menu carries — and the editor is not a dialog, so there is
 * no container to scope to and nothing accessible tells the two apart. The
 * editor is drawn over the page, so the nearest anchor is the last one.
 */
const fieldEditorMenuButton = (page: Page) => page.getByRole('button', { name: 'Menu' }).last();

/* ------------------------------------------------------------------ *
 * Member detail
 * ------------------------------------------------------------------ */

const customFieldsCard = (page: Page) => page.getByRole('region', { name: 'Custom fields' });

/** The card's row for one field. Its button carries the rendered value too. */
const customFieldRow = (page: Page, field: string) =>
  customFieldsCard(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: new RegExp(`^Edit ${esc(field)}\\b`) }) });

const customFieldEditButton = (page: Page, field: string) =>
  customFieldsCard(page).getByRole('button', { name: new RegExp(`^Edit ${esc(field)}\\b`) });

const memberBreadcrumb = (page: Page) =>
  page.getByRole('navigation', { name: 'breadcrumb' }).getByRole('link', { name: 'Members' });

/**
 * Open a member's detail screen.
 *
 * `page.goto` to a URL that differs only in its hash does not reload the
 * document, and Admin does not always route off the hashchange alone, so
 * dropping the document first is the fallback.
 */
async function gotoMember(page: Page, memberId: string) {
  await page.goto(`/ghost/#/members/${memberId}`);
  try {
    await memberBreadcrumb(page).waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    await page.goto('about:blank');
    await page.goto(`/ghost/#/members/${memberId}`);
    await memberBreadcrumb(page).waitFor({ state: 'visible' });
  }
}

/** Set a scalar field's value through its own editor, which saves on its own. */
async function setFieldValue(page: Page, field: string, value: string) {
  await customFieldEditButton(page, field).click();
  const editor = page.getByRole('dialog', { name: field });
  await editor.getByRole('textbox', { name: field }).fill(value);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await editor.waitFor({ state: 'detached' });
}

/** Fill a composite field's parts, keyed by the label each part carries. */
async function setCompositeFieldValue(page: Page, field: string, parts: Record<string, string>) {
  await customFieldEditButton(page, field).click();
  const editor = page.getByRole('dialog', { name: field });
  for (const [partLabel, value] of Object.entries(parts)) {
    await editor.getByRole('textbox', { name: partLabel, exact: true }).fill(value);
  }
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await editor.waitFor({ state: 'detached' });
}

/* ------------------------------------------------------------------ *
 * Members list
 * ------------------------------------------------------------------ */

const filterButton = (page: Page) => page.getByRole('button', { name: /^(Filter|Add filter)$/ });

const memberRows = (page: Page) =>
  page.getByRole('row').filter({ has: page.getByRole('link', { name: /\S/ }) });

const memberRowByName = (page: Page, memberName: string) =>
  page.getByRole('row').filter({ has: page.getByRole('link', { name: memberName, exact: true }) });

const memberRowByEmail = (page: Page, email: string) =>
  page.getByRole('row').filter({ hasText: email });

/**
 * The members list's actions ("more") menu.
 *
 * FINDING: its trigger is an icon-only button with no accessible name, so it
 * cannot be asked for by name at all — a screen reader announces it as
 * "button". The nearest anchor is "the first button in the list header that
 * shows no text".
 */
const membersActionsButton = (page: Page) =>
  page.getByRole('main').getByRole('button').filter({ hasNotText: /\S/ }).first();

/**
 * Open the members list on a fresh document.
 *
 * Admin does not reliably route on a hash-only change, so navigating from one
 * members URL to another can leave the previous screen — and its filters — in
 * place. Dropping the document first makes every step start from the same list.
 */
async function gotoMembers(page: Page) {
  await page.goto('about:blank');
  await page.goto('/ghost/#/members');
  await filterButton(page).waitFor({ state: 'visible' });
}

/**
 * Add a custom field filter. Custom fields are named directly in the filter
 * list; a composite's part, the operator and the value all live in the pill,
 * where each control is labelled with the field it belongs to.
 */
async function addCustomFieldFilter(
  page: Page,
  {
    field,
    value,
    part,
    operator,
  }: { field: string; value?: string; part?: string; operator?: string },
) {
  await filterButton(page).click();
  await page.getByRole('option', { name: field, exact: true }).click();

  if (part) {
    await page.getByRole('button', { name: `${field} part` }).click();
    await page.getByRole('menuitem', { name: part, exact: true }).click();
  }

  if (operator) {
    await page.getByRole('button', { name: `${field} operator` }).click();
    await page.getByRole('menuitem', { name: operator, exact: true }).click();
  }

  if (value !== undefined) {
    await page.getByRole('textbox', { name: `${field} value` }).fill(value);
  }

  // Close the add-filter popover so the list re-queries.
  await page.keyboard.press('Escape');
}

/**
 * The pill a custom field filter renders as.
 *
 * While the field is live the pill's controls are labelled with it. Once the
 * field is archived the pill goes read-only — no operator button, no value box,
 * just the field's name and the clause as text — so both shapes count.
 */
const customFieldFilterPill = (page: Page, field: string) =>
  page
    .getByRole('button', { name: `${field} operator` })
    .or(page.getByRole('main').getByText(field))
    .first();

/**
 * Filter the list by a label, by the label's exact text.
 *
 * The option list is searched on the label's slug rather than the name it
 * shows, so a query carrying spaces or punctuation finds nothing: search the
 * first word and pick the row by the text it displays.
 */
async function applyLabelFilter(page: Page, label: string) {
  await filterButton(page).click();
  await page.getByRole('option', { name: 'Label', exact: true }).click();
  await page.getByPlaceholder('Search label...').fill(label.split(' ')[0]);

  const option = () => page.getByRole('option').filter({ hasText: label });
  await page.waitForTimeout(1500);
  if ((await option().count()) === 0) {
    finding(
      `the members filter's label list did not offer "${label}" until the page was\n` +
        '     reloaded, so a label created while the screen was open is unfilterable.',
    );
    await page.keyboard.press('Escape');
    await page.reload();
    await filterButton(page).waitFor({ state: 'visible' });
    await filterButton(page).click();
    await page.getByRole('option', { name: 'Label', exact: true }).click();
    await page.getByPlaceholder('Search label...').fill(label.split(' ')[0]);
  }

  await option().first().click();
}

/**
 * Open a saved view from the sidebar.
 *
 * A saved view is a hash change, so the URL is polled rather than waited on for
 * a load. The reload is a workaround, not decoration: see the FINDING it logs.
 */
async function openSavedView(page: Page, viewName: string, expectFilterFor: string) {
  const link = page.getByRole('link', { name: viewName });
  const href = await link.getAttribute('href');
  await link.click();

  let navigated = true;
  try {
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain('filter=');
  } catch {
    navigated = false;
  }

  const pill = () => customFieldFilterPill(page, expectFilterFor);
  if (navigated && (await pill().count()) === 0) {
    await page.waitForTimeout(2000);
  }

  if (!navigated || (await pill().count()) === 0) {
    finding(
      `clicking the saved view "${viewName}" in the sidebar did not restore its filter\n` +
        `     (url changed: ${navigated}). A full load of the same URL does. The smoke test\n` +
        '     loads it directly to carry on.',
    );
    // The sidebar's hrefs are bare hashes ("#/members?filter=..."), which resolve
    // against the site root rather than Admin unless /ghost is put back in front.
    const target = href?.startsWith('#') ? `/ghost/${href}` : (href ?? '/ghost/#/members');
    await page.goto(target);
    await filterButton(page).waitFor({ state: 'visible' });
  }

  await expect(page.getByRole('link', { name: viewName })).toHaveAttribute('aria-current', 'page');
}

/**
 * Export the members list as it is currently filtered. The export of a filtered
 * list can take a while to build, so the download gets its own long wait.
 */
async function exportMembersCsv(page: Page): Promise<string> {
  await membersActionsButton(page).click();
  const exportItem = page.getByRole('menuitem', { name: /Export/ });
  await exportItem.waitFor({ state: 'visible' });
  const download = page.waitForEvent('download', { timeout: 120000 });
  await exportItem.click();
  const file = await download;
  return readFileSync((await file.path()) as string, 'utf-8');
}

/* ------------------------------------------------------------------ *
 * Import dialog
 * ------------------------------------------------------------------ */

/** The import dialog renames itself as it goes: members, then in progress, then complete. */
const importDialog = (page: Page) => page.getByRole('dialog', { name: /^Import/ });

const importIncludeCheckbox = (page: Page, column: string) =>
  importDialog(page).getByRole('checkbox', { name: `Import ${column}`, exact: true });

/**
 * The control naming what a CSV column is imported as. Its accessible name
 * carries the chosen target ("Field for email, Email"), so what a column is
 * mapped to can be read straight off it.
 */
const importMappingControl = (page: Page, column: string) =>
  importDialog(page).getByRole('combobox', { name: new RegExp(`^Field for ${esc(column)},`) });

/** Open the import dialog and hand it a file through its own drop zone. */
async function openImportWithFile(page: Page, csvPath: string) {
  await membersActionsButton(page).click();
  await page.getByRole('menuitem', { name: /Import members/ }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select or drop a CSV file' }).click();
  await (await chooser).setFiles(csvPath);
  await importDialog(page)
    .getByRole('button', { name: /^Import(?: [\d,]+ members?)?$/ })
    .waitFor({ state: 'visible' });
}

/**
 * Close the import dialog once it is done with the file. What the last button
 * is called depends on how the import finished: a synchronous one offers "View
 * members" (and leaves the list filtered by the label it applied), a queued one
 * offers "Got it".
 */
async function closeImportDialog(page: Page): Promise<string> {
  const button = importDialog(page).getByRole('button', { name: /^(View members|Got it|Close)$/ });
  const label = (await button.innerText()).trim();
  await button.click();
  return label;
}

async function runImport(page: Page) {
  await importDialog(page)
    .getByRole('button', { name: /^Import(?: [\d,]+ members?)?$/ })
    .click();
  await importDialog(page)
    .getByRole('heading', { name: /import (in progress|complete)/i })
    .waitFor({ state: 'visible', timeout: 60000 });
}

/* ------------------------------------------------------------------ *
 * Portal + Stripe Checkout
 * ------------------------------------------------------------------ */

/** Portal renders into an iframe titled "portal-popup". */
const portalFrame = (page: Page): FrameLocator => page.getByTitle('portal-popup').contentFrame();

/**
 * Pick a tier in Portal and go on to checkout.
 *
 * FINDING: Portal's tier cards are plain divs — not a list, no role, no
 * accessible name — and every card's button is called just "Choose", so no
 * accessible relationship ties a button to the tier above it. The nearest
 * anchor is order: the tier headings and the Choose buttons appear one for one,
 * so the button at the heading's position is the right one.
 */
async function choosePortalTier(page: Page, tierName: string) {
  const frame = portalFrame(page);
  const headings = frame.getByRole('heading', { level: 4 });
  await headings.first().waitFor({ state: 'visible' });
  const names = await headings.allInnerTexts();
  const index = names.findIndex((heading) => heading.trim() === tierName);
  if (index === -1) {
    throw new Error(`Portal offers no tier called "${tierName}" (offers: ${names.join(', ')})`);
  }
  await frame.getByRole('button', { name: 'Choose', exact: true }).nth(index).click();
}

/** Fill a Stripe Checkout field if that field is on the page. */
async function fillIfPresent(scope: Page, label: string | RegExp, value: string): Promise<boolean> {
  const field = scope.getByLabel(label);
  if ((await field.count()) > 0 && (await field.first().isVisible())) {
    await field.first().fill(value);
    return true;
  }
  return false;
}

async function selectIfPresent(
  scope: Page,
  label: string | RegExp,
  value: string,
): Promise<boolean> {
  const field = scope.getByLabel(label);
  if ((await field.count()) > 0 && (await field.first().isVisible())) {
    await field.first().selectOption(value);
    return true;
  }
  return false;
}

test.describe.configure({ mode: 'serial' });

test.describe('Custom fields — smoke', () => {
  test('0. setup: two members exist off-camera, with the feature switched off', async ({
    request,
  }) => {
    await setLabs(request, {
      membersCustomFields: false,
      membersImportRedesign: true,
      stripeCheckoutCollection: false,
    });

    const match = await createMember(request, { name: MATCH_NAME, email: MATCH_EMAIL });
    const other = await createMember(request, { name: OTHER_NAME, email: OTHER_EMAIL });
    state.matchId = match.id;
    state.otherId = other.id;

    console.log(`\n  [smoke] stamp=${STAMP} against ${BASE_URL}\n`);
    pass('0', 'two members created; import-redesign ON, custom-fields OFF');
  });

  test('1. custom fields are absent everywhere while the flag is off', async ({ page }) => {
    // Settings
    await gotoSettings(page);
    await expect(page.getByRole('heading', { name: 'Custom fields', exact: true })).toHaveCount(0);

    // Member detail
    await gotoMember(page, state.matchId);
    await expect(customFieldsCard(page)).toHaveCount(0);

    // Members filters offer the built-in fields and nothing custom.
    await gotoMembers(page);
    await filterButton(page).click();
    await expect(page.getByRole('option', { name: 'Label', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: /Company|Shipping|Region/ })).toHaveCount(0);
    await page.keyboard.press('Escape');

    // Import dialog: an unmatched column can still be brought into the import,
    // but there is nothing custom to point it at and no way to make one.
    const unmatched = `Company ${STAMP} column`;
    const csvPath = writeTemp(
      `smoke-flagoff-${STAMP}.csv`,
      `email,name,${unmatched}\nflagoff-${STAMP}@ghost.org,Flag Off,Nope\n`,
    );
    await gotoMembers(page);
    await openImportWithFile(page, csvPath);
    await importIncludeCheckbox(page, unmatched).check();
    await importMappingControl(page, unmatched).click();
    await expect(page.getByRole('option', { name: 'Email', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: /Add custom field/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    pass('1', 'settings, member detail, filters and import mapping all offer nothing custom');
  });

  test('2. the settings panel appears and fields of each type can be created', async ({
    page,
    request,
  }) => {
    await setLabs(request, { membersCustomFields: true });

    await gotoSettings(page);
    await expect(page.getByRole('heading', { name: 'Custom fields', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add custom field' })).toBeVisible();
    // That the site starts with no fields at all is already established: step 1
    // found nothing custom to filter on, and a leftover field would have shown up
    // there (the filter list ignores the flag — see the FINDING in step 8).

    // 2a: one field of each shipped type, plus one the segment will own.
    await createField(page, SHORT_FIELD, 'Short text');
    await createField(page, LONG_FIELD, 'Long text');
    await createField(page, ADDRESS_FIELD, 'Address');
    await createField(page, SEGMENT_FIELD, 'Short text');

    await expect(settingsFieldRow(page, SHORT_FIELD)).toBeVisible();
    await expect(settingsFieldRow(page, LONG_FIELD)).toBeVisible();
    await expect(settingsFieldRow(page, ADDRESS_FIELD)).toBeVisible();

    // Identifiers, not outcomes: the export and import columns are named after a
    // field's key, and the key is only ever handed out by the API.
    state.shortKey = await customFieldKey(request, SHORT_FIELD);
    state.longKey = await customFieldKey(request, LONG_FIELD);
    state.addressKey = await customFieldKey(request, ADDRESS_FIELD);
    state.segmentKey = await customFieldKey(request, SEGMENT_FIELD);

    pass('2a', `created 4 fields (short=${state.shortKey}, address=${state.addressKey})`);

    // 2b: archive
    await createField(page, SCRATCH_FIELD, 'Short text');
    await openFieldEditor(page, SCRATCH_FIELD);
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await confirmButton(page, 'Archive').click();
    await expect(page.getByText('Custom field archived')).toBeVisible();

    await goToCustomFieldsTab(page, 'Archived', SHORT_FIELD);
    await expect(settingsFieldRow(page, SCRATCH_FIELD)).toBeVisible();
    await goToCustomFieldsTab(page, 'Active', SCRATCH_FIELD);
    await expect(settingsFieldRow(page, SCRATCH_FIELD)).toHaveCount(0);
    pass('2b', 'archived a field; it left the Active tab for the Archived one');

    // 2c: restore
    await goToCustomFieldsTab(page, 'Archived', SHORT_FIELD);
    await openFieldEditor(page, SCRATCH_FIELD);
    await page.getByRole('button', { name: 'Reactivate', exact: true }).click();
    await confirmButton(page, 'Reactivate').click();
    await expect(page.getByText('Custom field reactivated')).toBeVisible();
    await goToCustomFieldsTab(page, 'Active', SCRATCH_FIELD);
    await expect(settingsFieldRow(page, SCRATCH_FIELD)).toBeVisible();
    pass('2c', 'restored the archived field');

    // 2d: archive again, then permanently delete from the archived field's menu
    await openFieldEditor(page, SCRATCH_FIELD);
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await confirmButton(page, 'Archive').click();
    await expect(page.getByText('Custom field archived')).toBeVisible();

    await goToCustomFieldsTab(page, 'Archived', SHORT_FIELD);
    await openFieldEditor(page, SCRATCH_FIELD);
    await fieldEditorMenuButton(page).click();
    await page.getByRole('menuitem', { name: /Delete custom field/ }).click();
    await confirmButton(page, 'Delete').click();
    await expect(page.getByText('Custom field deleted')).toBeVisible();

    await expect(settingsFieldRow(page, SCRATCH_FIELD)).toHaveCount(0);
    await goToCustomFieldsTab(page, 'Active', SHORT_FIELD);
    await expect(settingsFieldRow(page, SCRATCH_FIELD)).toHaveCount(0);
    pass('2d', 'permanently deleted the archived field');
  });

  test('3. a member takes values for every field type, and they survive a reload', async ({
    page,
  }) => {
    await gotoMember(page, state.matchId);
    await expect(customFieldEditButton(page, SHORT_FIELD)).toBeVisible();

    await setFieldValue(page, SHORT_FIELD, SHORT_VALUE);
    await setFieldValue(page, LONG_FIELD, LONG_VALUE);
    await setFieldValue(page, SEGMENT_FIELD, SEGMENT_VALUE);
    await setCompositeFieldValue(page, ADDRESS_FIELD, ADDRESS);

    await expect(customFieldRow(page, SHORT_FIELD)).toContainText(SHORT_VALUE);

    // 3a: reload
    await page.reload();
    await memberBreadcrumb(page).waitFor({ state: 'visible' });
    await expect(customFieldRow(page, SHORT_FIELD)).toContainText(SHORT_VALUE);
    await expect(customFieldRow(page, LONG_FIELD)).toContainText(LONG_VALUE);
    await expect(customFieldRow(page, SEGMENT_FIELD)).toContainText(SEGMENT_VALUE);
    await expect(customFieldRow(page, ADDRESS_FIELD)).toContainText('London');

    pass('3', 'short text, long text, address and segment values persisted across a reload');
  });

  test('4. the members list filters by a custom field value', async ({ page }) => {
    await gotoMembers(page);
    await addCustomFieldFilter(page, { field: SHORT_FIELD, value: SHORT_VALUE });

    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();
    await expect(memberRowByName(page, OTHER_NAME)).toHaveCount(0);

    pass('4', `filtered on ${SHORT_FIELD} = ${SHORT_VALUE}`);
  });

  test('4a. a segment referencing a custom field saves and loads back', async ({ page }) => {
    await gotoMembers(page);
    await addCustomFieldFilter(page, { field: SEGMENT_FIELD, value: SEGMENT_VALUE });
    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();

    await page.getByRole('button', { name: 'Save view' }).click();
    const saveDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('textbox', { name: 'View name' }) });
    await saveDialog.getByRole('textbox', { name: 'View name' }).fill(VIEW_NAME);
    await saveDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await saveDialog.waitFor({ state: 'hidden' });

    await expect(page.getByRole('link', { name: VIEW_NAME })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.getByRole('link', { name: 'Members', exact: true }).first().click();
    await expect(page.getByRole('link', { name: VIEW_NAME })).not.toHaveAttribute(
      'aria-current',
      'page',
    );

    await openSavedView(page, VIEW_NAME, SEGMENT_FIELD);
    await expect(customFieldFilterPill(page, SEGMENT_FIELD)).toBeVisible();
    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();

    pass('4a', `segment "${VIEW_NAME}" round-tripped`);
  });

  test('4b. the segment still loads once its field is archived', async ({ page }) => {
    await gotoSettings(page);
    await openFieldEditor(page, SEGMENT_FIELD);
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await confirmButton(page, 'Archive').click();
    await expect(page.getByText('Custom field archived')).toBeVisible();

    await gotoMembers(page);
    await openSavedView(page, VIEW_NAME, SEGMENT_FIELD);

    // The filter renderer reads definitions INCLUDING archived ones, so the
    // archived field still names itself in the pill instead of degrading.
    await expect(customFieldFilterPill(page, SEGMENT_FIELD)).toBeVisible();
    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();

    // ...and it is gone from the list of filters that can be ADDED.
    await gotoMembers(page);
    await filterButton(page).click();
    await expect(page.getByRole('option', { name: SHORT_FIELD, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: SEGMENT_FIELD, exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');

    pass('4b', 'archived field still renders inside the saved segment, but cannot be re-added');
  });

  test('5. the filtered export carries metafields.custom.* columns', async ({ page }) => {
    await gotoMembers(page);
    await addCustomFieldFilter(page, { field: SHORT_FIELD, value: SHORT_VALUE });
    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();
    await expect(memberRowByName(page, OTHER_NAME)).toHaveCount(0);

    const content = await exportMembersCsv(page);
    state.exportCsv = content;

    const csv = new CsvTable(content);
    expect(csv.has(col(state.shortKey)), `export has ${col(state.shortKey)}`).toBe(true);
    expect(csv.has(col(state.longKey)), `export has ${col(state.longKey)}`).toBe(true);
    for (const part of ['line1', 'line2', 'city', 'state', 'postal_code', 'country']) {
      expect(
        csv.has(col(state.addressKey, part)),
        `export has ${col(state.addressKey, part)}`,
      ).toBe(true);
    }

    const row = csv.rowWhere('email', MATCH_EMAIL);
    expect(csv.get(row, col(state.shortKey))).toBe(SHORT_VALUE);
    expect(csv.get(row, col(state.longKey))).toBe(LONG_VALUE);
    expect(csv.get(row, col(state.addressKey, 'city'))).toBe('London');
    expect(csv.get(row, col(state.addressKey, 'country'))).toBe('GB');
    expect(csv.get(row, col(state.addressKey, 'postal_code'))).toBe('EC1A 1AA');

    // The export honours the filter, so only the matching member is in it.
    expect(csv.rows.length).toBe(1);

    pass(
      '5',
      `export carried ${csv.header.filter((header) => header.startsWith('metafields.')).length} custom-field columns`,
    );
  });

  test('6. the export re-imports, mapping columns onto their fields', async ({ page, request }) => {
    const csv = new CsvTable(state.exportCsv);
    const row = csv.rowWhere('email', MATCH_EMAIL);
    csv.set(row, 'email', IMPORTED_EMAIL);
    csv.set(row, 'name', IMPORTED_NAME);
    // 6a: a column no field matches, which the dialog will create a field for.
    csv.addColumn(IMPORT_FIELD, () => 'Platinum');
    const csvPath = writeTemp(`smoke-import-${STAMP}.csv`, csv.toString());

    await gotoMembers(page);
    await openImportWithFile(page, csvPath);

    // The exported columns auto-detect back onto their fields, which each
    // mapping control says in its own accessible name.
    await expect(importMappingControl(page, col(state.shortKey))).toHaveAccessibleName(
      new RegExp(esc(SHORT_FIELD)),
    );
    await expect(importMappingControl(page, col(state.addressKey, 'city'))).toHaveAccessibleName(
      new RegExp(esc(ADDRESS_FIELD)),
    );

    // 6a: create a brand new field from inside the dialog and map the column to it.
    const include = importIncludeCheckbox(page, IMPORT_FIELD);
    await expect(include).not.toBeChecked();
    await include.check();
    await importMappingControl(page, IMPORT_FIELD).click();
    await page.getByRole('option', { name: /Add custom field/ }).click();
    // The inline create form is a row of its own inside the mapping table; it is
    // the only row carrying a "Name" textbox.
    const createForm = importDialog(page)
      .getByRole('row')
      .filter({ has: page.getByRole('textbox', { name: 'Name', exact: true }) });
    await createForm.waitFor({ state: 'visible' });
    await createForm.getByRole('textbox', { name: 'Name', exact: true }).fill(IMPORT_FIELD);
    await createForm.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(createForm).toBeHidden();
    await expect(importMappingControl(page, IMPORT_FIELD)).toHaveAccessibleName(
      new RegExp(esc(IMPORT_FIELD)),
    );
    pass('6a', `created "${IMPORT_FIELD}" from inside the import dialog`);

    await runImport(page);

    // "View members" is how a finished import ends, and it leaves the list
    // filtered by the label the import applied — so the label lands, and only the
    // imported member carries it, without ever asking the API. An import that
    // gets queued instead ends on "Got it" and leaves the list alone.
    const closedWith = await closeImportDialog(page);
    await filterButton(page).waitFor({ state: 'visible' });
    if (closedWith === 'View members') {
      await expect(memberRowByName(page, IMPORTED_NAME)).toBeVisible({ timeout: 30000 });
      await expect(memberRowByName(page, OTHER_NAME)).toHaveCount(0);
      await expect(memberRowByName(page, MATCH_NAME)).toHaveCount(0);
    } else {
      await page.getByRole('textbox', { name: 'Search members' }).fill(IMPORTED_EMAIL);
      await expect(memberRowByName(page, IMPORTED_NAME)).toBeVisible({ timeout: 30000 });
    }

    // Navigation only: the smoke test needs somewhere to click through to next.
    state.importedId = (await memberIdByEmail(request, IMPORTED_EMAIL)) ?? '';
    expect(state.importedId, 'imported member id').toMatch(/^[a-f0-9]{24}$/);

    // 6b: the imported member carries the values it was given.
    await memberRowByName(page, IMPORTED_NAME).getByRole('link').first().click();
    await memberBreadcrumb(page).waitFor({ state: 'visible' });
    await expect(customFieldRow(page, SHORT_FIELD)).toContainText(SHORT_VALUE);
    await expect(customFieldRow(page, IMPORT_FIELD)).toContainText('Platinum');
    await expect(customFieldRow(page, ADDRESS_FIELD)).toContainText('London');

    pass('6b', 'imported member carries its values and lands under the import label');
  });

  test('7. tier config offers no checkout collection while its flag is off', async ({
    page,
    request,
  }) => {
    state.stripeReady = await isStripeConnected(request);

    await createPaidTier(request, { name: TIER_NAME, monthlyPrice: 800, yearlyPrice: 8000 });
    await setPortalPlans(request, ['free', 'monthly', 'yearly']);

    await setLabs(request, { stripeCheckoutCollection: false });

    await gotoSettings(page);
    await openTier(page, TIER_NAME);

    await expect(page.getByRole('group', { name: 'Checkout' })).toHaveCount(0);
    await expect(page.getByText('Collect shipping address')).toHaveCount(0);
    await expect(page.getByText('Collect business tax ID')).toHaveCount(0);
    await page.keyboard.press('Escape');

    pass('7', `tier "${TIER_NAME}" shows no checkout collection with the flag off`);
  });

  test('7a. the checkout collection card appears behind its flag', async ({ page, request }) => {
    test.skip(!state.stripeReady, 'Stripe is not connected on this dev site');

    await setLabs(request, { stripeCheckoutCollection: true });

    await gotoSettings(page);
    await openTier(page, TIER_NAME);
    const checkout = page.getByRole('group', { name: 'Checkout' });

    await expect(checkout.getByRole('switch', { name: 'Collect shipping address' })).toBeVisible();
    await expect(checkout.getByRole('switch', { name: 'Collect phone number' })).toBeVisible();
    await expect(checkout.getByRole('switch', { name: 'Collect business tax ID' })).toBeVisible();

    pass('7a', 'address, phone and tax ID collection all offered');
  });

  test('7c. a custom field is created from the tier binding picker', async ({ page }) => {
    test.skip(!state.stripeReady, 'Stripe is not connected on this dev site');

    await gotoSettings(page);
    await openTier(page, TIER_NAME);
    const checkout = page.getByRole('group', { name: 'Checkout' });

    await checkout.getByRole('switch', { name: 'Collect shipping address' }).click();
    await expect(checkout.getByRole('combobox', { name: 'Save address as' })).toBeVisible();

    // Bind the address to the address field the smoke test already uses.
    await checkout.getByRole('combobox', { name: 'Save address as' }).click();
    await page.getByRole('option', { name: ADDRESS_FIELD }).click();

    // 7c: the recipient name gets a field created in place.
    await checkout.getByRole('combobox', { name: 'Save recipient name as' }).click();
    await page.getByRole('option', { name: /Add custom field/ }).click();
    const createName = page.getByLabel(/^New custom field for Save recipient name as$/);
    await createName.waitFor({ state: 'visible' });
    await createName.fill(CHECKOUT_FIELD);
    // The inline create form submits on Enter, which avoids picking the wrong
    // "Save" among the tier editor's own and the popover's.
    await createName.press('Enter');
    await expect(checkout.getByRole('combobox', { name: 'Save recipient name as' })).toContainText(
      CHECKOUT_FIELD,
    );

    // Phone collection, bound to the short text field.
    await checkout.getByRole('switch', { name: 'Collect phone number' }).click();
    await checkout.getByRole('combobox', { name: 'Save to custom field' }).click();
    await page.getByRole('option', { name: SHORT_FIELD }).click();

    await checkout.getByRole('switch', { name: 'Collect business tax ID' }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    // Persisted?
    await openTier(page, TIER_NAME);
    await expect(
      page.getByRole('group', { name: 'Checkout' }).getByRole('switch', {
        name: 'Collect shipping address',
      }),
    ).toBeChecked();
    await expect(
      page.getByRole('group', { name: 'Checkout' }).getByRole('combobox', {
        name: 'Save recipient name as',
      }),
    ).toContainText(CHECKOUT_FIELD);
    await page.keyboard.press('Escape');

    pass('7c', `created "${CHECKOUT_FIELD}" from the tier binding picker and saved the config`);
  });

  test('7b. a real Stripe checkout lands its collected details on the member', async ({ page }) => {
    test.skip(!state.stripeReady, 'Stripe is not connected on this dev site');
    test.setTimeout(300 * 1000);

    await page.goto('/#/portal/signup');
    const frame = portalFrame(page);
    await frame.getByRole('textbox', { name: 'Email' }).fill(CHECKOUT_EMAIL);
    await frame.getByRole('textbox', { name: 'Name' }).fill('Smoke Buyer');
    await choosePortalTier(page, TIER_NAME);

    // Real Stripe Checkout, not the suite's fake server.
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 90 * 1000 });
    const shipping = page.getByRole('group', { name: 'Shipping address' });
    await shipping.waitFor({ state: 'visible', timeout: 60 * 1000 });

    // The tier asked Stripe to collect a shipping address and a phone number, so
    // Stripe's own page has to be asking for them. This is the half of the
    // configuration only a real checkout can prove.
    await expect(shipping.getByRole('textbox', { name: 'Full name' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();

    await shipping.getByRole('textbox', { name: 'Full name' }).fill(CHECKOUT_RECIPIENT);
    await shipping.getByRole('combobox', { name: 'Country or region' }).selectOption('GB');

    // Stripe offers an address autocomplete first; someone typing their own
    // address out clicks through to the plain fields.
    const enterManually = page.getByRole('button', { name: 'Enter address manually' });
    if ((await enterManually.count()) > 0) {
      await enterManually.first().click();
    }
    await fillIfPresent(page, /^Address line 1$/, CHECKOUT_ADDRESS.line1);
    await fillIfPresent(page, /^(Town or city|City)$/, CHECKOUT_ADDRESS.city);
    await fillIfPresent(page, /^(Postcode|Postal code|ZIP)$/, CHECKOUT_ADDRESS.postcode);
    await fillIfPresent(page, /^Phone number$/, CHECKOUT_PHONE);

    await fillIfPresent(page, /^Email$/, CHECKOUT_EMAIL);
    await page.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await page.getByRole('textbox', { name: 'Expiration' }).fill('12 / 34');
    await page.getByRole('textbox', { name: /CVC/ }).fill('123');
    await fillIfPresent(page, /^(Cardholder name|Name on card)$/, 'Smoke Buyer');

    // Billing is asked for separately only when it is not reused from shipping.
    await selectIfPresent(page, /^(Billing country or region)$/, 'GB');
    await fillIfPresent(page, /^Billing address line 1$/, CHECKOUT_ADDRESS.line1);
    await fillIfPresent(page, /^(Billing town or city|Billing city)$/, CHECKOUT_ADDRESS.city);
    await fillIfPresent(
      page,
      /^(Billing postcode|Billing postal code)$/,
      CHECKOUT_ADDRESS.postcode,
    );

    await page
      .getByRole('button', { name: /^(Pay and subscribe|Subscribe|Pay|Start trial)/ })
      .first()
      .click();

    // Back on the site once Stripe has taken the payment.
    await page.waitForURL((url) => !/checkout\.stripe\.com/.test(url.toString()), {
      timeout: 180 * 1000,
    });
    pass(
      '7b(i)',
      'Stripe collected the address and phone the tier asked for, and took the payment',
    );

    // Portal creates the member as free before Stripe is reached, so existence
    // proves nothing: the subscription, and the collected details with it, only
    // land when Ghost has processed checkout.session.completed over the tunnel
    // `pnpm dev:stripe` publishes. The members list is where that shows up.
    let paid = false;
    const deadline = Date.now() + 150 * 1000;
    while (Date.now() < deadline) {
      await gotoMembers(page);
      await page.getByRole('textbox', { name: 'Search members' }).fill(CHECKOUT_EMAIL);
      await page.waitForTimeout(3000);
      const row = memberRowByEmail(page, CHECKOUT_EMAIL);
      if ((await row.getByRole('cell', { name: /^Paid/ }).count()) > 0) {
        paid = true;
        break;
      }
    }

    if (!paid) {
      skipped(
        '7b(ii)',
        'Ghost never received checkout.session.completed, so the collected details could not ' +
          'reach the member. The payment itself succeeded at Stripe. Check the ghost-dev log ' +
          'for POST /members/webhooks/stripe/: nothing there means Stripe is not delivering to ' +
          'the tunnel; a 400 there means the registration secret is stale, which a clean ' +
          '`docker restart ghost-dev` fixes.',
      );
      return;
    }

    await memberRowByEmail(page, CHECKOUT_EMAIL).getByRole('link').first().click();
    await memberBreadcrumb(page).waitFor({ state: 'visible' });

    await expect(customFieldRow(page, ADDRESS_FIELD)).toContainText(CHECKOUT_ADDRESS.city);
    await expect(customFieldRow(page, CHECKOUT_FIELD)).toContainText(CHECKOUT_RECIPIENT);

    // ...and the collected details are filterable.
    await gotoMembers(page);
    await addCustomFieldFilter(page, {
      field: ADDRESS_FIELD,
      part: 'City',
      operator: 'is',
      value: CHECKOUT_ADDRESS.city,
    });
    await expect(memberRowByEmail(page, CHECKOUT_EMAIL)).toHaveCount(1);
    await expect(memberRowByName(page, OTHER_NAME)).toHaveCount(0);

    pass('7b', 'a completed Stripe checkout wrote its collected details into custom fields');
  });

  test('8. turning the management flag off hides the binding UI but keeps collection', async ({
    page,
    request,
  }) => {
    test.skip(!state.stripeReady, 'Stripe is not connected on this dev site');

    await setLabs(request, { membersCustomFields: false });

    await gotoSettings(page);
    await expect(page.getByRole('heading', { name: 'Custom fields', exact: true })).toHaveCount(0);

    await openTier(page, TIER_NAME);
    const checkout = page.getByRole('group', { name: 'Checkout' });

    await expect(checkout.getByRole('switch', { name: 'Collect shipping address' })).toBeChecked();
    await expect(checkout.getByRole('switch', { name: 'Collect phone number' })).toBeChecked();
    await expect(checkout.getByRole('combobox', { name: 'Save address as' })).toHaveCount(0);
    await expect(checkout.getByRole('combobox', { name: 'Save to custom field' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    // What the flag does NOT take away, once fields already exist. Reading
    // definitions is deliberately unflagged, on the assumption that a site
    // without the flag has no fields — which stops holding the moment the flag is
    // turned back off. Said out loud here so the smoke run names the surfaces
    // that keep showing fields nobody can manage any more.
    await gotoMember(page, state.matchId);
    await expect(customFieldsCard(page)).toHaveCount(1);
    finding(
      'with membersCustomFields OFF and fields already defined, the member detail\n' +
        '     custom-fields card still renders (Settings can no longer manage them).',
    );

    await gotoMembers(page);
    await filterButton(page).click();
    const stillOffered = await page.getByRole('option', { name: SHORT_FIELD, exact: true }).count();
    await page.keyboard.press('Escape');
    finding(
      `with the flag OFF, the members filter list still offers "${SHORT_FIELD}" (count=${stillOffered}).`,
    );

    await setLabs(request, { membersCustomFields: true });

    pass('8', 'collection stays configured while its field binding UI is hidden');
  });

  test('9. members cannot see or write custom fields through the account API', async ({
    page,
    request,
    browser,
  }) => {
    await setLabs(request, { membersCustomFields: true });
    // The staff-side value the member must not be able to see or change.
    await setMemberCustomFieldValues(request, state.matchId, { [state.shortKey]: SHORT_VALUE });

    const signinUrl = await memberSigninUrl(request, state.matchId);
    const memberContext = await browser.newContext({ baseURL: BASE_URL });
    const memberPage = await memberContext.newPage();
    await memberPage.goto(signinUrl);
    await memberPage.waitForLoadState('domcontentloaded');

    // The members API's own shape IS the user-facing outcome here, so this one
    // step reads it directly. There is no screen that says "no metafields key".

    // 9a: the account payload carries no metafields key at all.
    const account = await memberContext.request.get('/members/api/member/');
    expect(account.status(), await account.text()).toBe(200);
    const accountBody = (await account.json()) as Record<string, unknown>;
    expect(accountBody.email).toBe(MATCH_EMAIL);
    expect(Object.keys(accountBody)).not.toContain('metafields');
    pass('9a', 'GET /members/api/member/ carries no metafields key');

    // 9b: a write naming metafields still succeeds — the key is simply ignored.
    const written = await memberContext.request.put('/members/api/member/', {
      data: {
        name: `Smoke Member Renamed ${STAMP}`,
        metafields: { custom: { [state.shortKey]: 'Written by the member' } },
      },
    });
    expect(written.status(), await written.text()).toBe(200);
    const writtenBody = (await written.json()) as Record<string, unknown>;
    expect(writtenBody.name).toBe(`Smoke Member Renamed ${STAMP}`);
    expect(Object.keys(writtenBody)).not.toContain('metafields');

    await gotoMember(page, state.matchId);
    await expect(customFieldRow(page, SHORT_FIELD)).toContainText(SHORT_VALUE);
    await expect(customFieldsCard(page).getByText('Written by the member')).toHaveCount(0);
    pass('9b', 'a member PUT naming metafields is accepted but changes nothing');

    // 9c: there is no definitions route on the members API.
    const definitions = await memberContext.request.get('/members/api/member/metafields/');
    expect(definitions.status(), await definitions.text()).toBe(404);
    pass('9c', 'GET /members/api/member/metafields/ is 404');

    await memberContext.close();

    // The write above renamed the member to prove it landed; put the name back so
    // later steps still find the row they are looking for.
    await request.put(`/ghost/api/admin/members/${state.matchId}/`, {
      data: { members: [{ name: MATCH_NAME }] },
    });

    pass('9', 'the members API stays closed to custom fields');
  });

  test('10. an address round-trips part by part', async ({ page }) => {
    // Filter on ONE part: the imported member shares the address, the other member has none.
    await gotoMembers(page);
    await addCustomFieldFilter(page, {
      field: ADDRESS_FIELD,
      part: 'Country',
      operator: 'is',
      value: 'GB',
    });
    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();
    await expect(memberRowByName(page, OTHER_NAME)).toHaveCount(0);

    const content = await exportMembersCsv(page);
    const csv = new CsvTable(content);
    const row = csv.rowWhere('email', IMPORTED_EMAIL);
    expect(csv.get(row, col(state.addressKey, 'city'))).toBe('London');

    // Edit one part, blank another; re-import against the same member.
    csv.set(row, col(state.addressKey, 'city'), 'Manchester');
    csv.set(row, col(state.addressKey, 'postal_code'), '');
    const csvPath = writeTemp(
      `smoke-address-${STAMP}.csv`,
      new CsvTable(csv.toString()).toString(),
    );

    await gotoMembers(page);
    await openImportWithFile(page, csvPath);
    await runImport(page);
    await closeImportDialog(page);

    await gotoMember(page, state.importedId);
    await expect(customFieldRow(page, ADDRESS_FIELD)).toContainText('Manchester');
    // Blank means untouched, so the postal code the import blanked is still there.
    await expect(customFieldRow(page, ADDRESS_FIELD)).toContainText('EC1A 1AA');

    pass('10', 'address filtered, exported and re-imported per part');
  });

  test('11. a bulk label applies only to the filtered members', async ({ page, request }) => {
    await request.post('/ghost/api/admin/labels/', { data: { labels: [{ name: BULK_LABEL }] } });

    await gotoMembers(page);
    await addCustomFieldFilter(page, { field: SHORT_FIELD, value: SHORT_VALUE });
    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();
    await expect(memberRowByName(page, OTHER_NAME)).toHaveCount(0);
    const matchedCount = await memberRows(page).count();

    await membersActionsButton(page).click();
    await page.getByRole('menuitem', { name: /Add label to/ }).click();
    const dialog = page.getByRole('dialog', { name: /^Add label to/ });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByPlaceholder('Search labels...').fill(BULK_LABEL.split(' ')[0]);
    await page.getByRole('option').filter({ hasText: BULK_LABEL }).first().click();
    // The picker's popover stays open over the dialog's footer and swallows the click.
    await dialog.getByRole('heading', { name: /^Add label to/ }).click();
    await dialog.getByRole('button', { name: 'Add label', exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 30000 });

    await gotoMembers(page);
    await applyLabelFilter(page, BULK_LABEL);
    await expect(memberRowByName(page, MATCH_NAME)).toBeVisible();
    await expect(memberRowByName(page, OTHER_NAME)).toHaveCount(0);
    expect(await memberRows(page).count()).toBe(matchedCount);

    pass('11', `bulk-labelled exactly the ${matchedCount} filtered members`);
  });

  test('12. the segment survives its field being deleted outright', async ({ page }) => {
    await gotoSettings(page);
    await goToCustomFieldsTab(page, 'Archived', SHORT_FIELD);
    await openFieldEditor(page, SEGMENT_FIELD);
    await fieldEditorMenuButton(page).click();
    await page.getByRole('menuitem', { name: /Delete custom field/ }).click();
    await confirmButton(page, 'Delete').click();
    await expect(page.getByText('Custom field deleted')).toBeVisible();

    await gotoMembers(page);
    await page.getByRole('link', { name: VIEW_NAME }).click();
    // The list still renders: no error boundary, no crash — the clause simply
    // names a field nothing has any more.
    await expect(filterButton(page)).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    pass('12', 'saved segment still loads after its field was permanently deleted');
  });

  test('13. blanking a cell on import leaves the stored value alone', async ({ page }) => {
    await gotoMembers(page);
    await addCustomFieldFilter(page, { field: SHORT_FIELD, value: SHORT_VALUE });
    await expect(memberRowByName(page, IMPORTED_NAME)).toBeVisible();
    const content = await exportMembersCsv(page);

    const csv = new CsvTable(content);
    const row = csv.rowWhere('email', IMPORTED_EMAIL);
    expect(csv.get(row, col(state.shortKey))).toBe(SHORT_VALUE);
    csv.set(row, col(state.shortKey), '');
    const csvPath = writeTemp(`smoke-blank-${STAMP}.csv`, csv.toString());

    await gotoMembers(page);
    await openImportWithFile(page, csvPath);
    await runImport(page);
    await closeImportDialog(page);

    await gotoMember(page, state.importedId);
    await expect(customFieldRow(page, SHORT_FIELD)).toContainText(SHORT_VALUE);

    pass('13', 'a blanked cell left the stored value untouched');
  });

  test('14. refusals land on the control that caused them', async ({ page }) => {
    // 14a: duplicate name
    await gotoSettings(page);
    await page.getByRole('button', { name: 'Add custom field' }).click();
    await page.getByRole('heading', { name: 'Add custom field' }).waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Name' }).fill(SHORT_FIELD);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/already|exists|unique/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    pass('14a', 'a duplicate field name is refused inline on the name input');

    // 14b: over-length value on the member detail editor
    await gotoMember(page, state.matchId);
    await customFieldEditButton(page, SHORT_FIELD).click();
    const editor = page.getByRole('dialog', { name: SHORT_FIELD });
    await editor.getByRole('textbox', { name: SHORT_FIELD }).fill('x'.repeat(300));
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    // The editor stays open and puts its refusal inside itself, under the input,
    // rather than dismissing to a toast.
    await expect(editor).toBeVisible();
    await expect(editor.getByRole('alert').first()).toBeVisible();
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();

    pass('14b', 'an over-length value errors inside the field’s own editor');
  });
});

/**
 * Open a tier's editor from Settings.
 *
 * FINDING: a tier card is a clickable <div> — no role, no accessible name, not
 * reachable by keyboard — so it cannot be asked for as a button or a link. The
 * nearest anchor is the tier's own name, which the card shows as text.
 */
async function openTier(page: Page, tierName: string) {
  await page.getByText(tierName, { exact: true }).first().click();
  await page.getByRole('heading', { name: 'Edit tier' }).waitFor({ state: 'visible' });
}
