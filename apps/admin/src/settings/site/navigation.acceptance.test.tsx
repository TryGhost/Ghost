import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  fakeEditSettings,
  fakeOffers,
  fakeSearchIndex,
  fakeSettingsScreens,
  offer,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import * as sel from '@tryghost/test-data/selectors/settings';
import { settingsScreen } from '@/settings/settings.screen';

function primaryNavigation() {
  return settingsScreen.navigationModal().getByRole('tabpanel').first();
}

function existingItem(index = 0) {
  return primaryNavigation().getByTestId(sel.navigationItemEditor).nth(index);
}

function newItem() {
  return primaryNavigation().getByTestId(sel.newNavigationItem);
}

// The suggestion dropdown renders in a portal, outside the modal
function suggestions() {
  return page.getByRole('listbox', { name: 'URL suggestions' });
}

function fakeSiteContent() {
  fakeSearchIndex({
    pages: [{ id: 'p1', title: 'About', url: 'http://test.com/about/', status: 'published' }],
    posts: [
      { id: 'p2', title: 'Welcome to Ghost', url: 'http://test.com/welcome/', status: 'published' },
      { id: 'p3', title: 'Draft thoughts', url: 'http://test.com/404/', status: 'draft' },
    ],
  });
}

// The portal checkout links (gift, tips) are only suggested when Stripe is
// connected — the default fixture has it disconnected
const stripeConnectedBoot = {
  boot: {
    browseSettings: {
      response: settingsResponse({
        settings: {
          stripe_connect_publishable_key: 'pk_test_123',
          stripe_connect_secret_key: 'sk_test_123',
        },
      }),
    },
  },
};

describe('Navigation settings', () => {
  it('edits primary and secondary navigation', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/navigation/edit');

    const modal = settingsScreen.navigationModal();
    const primaryTab = modal.getByRole('tab', { name: 'Primary' });
    const secondaryTab = modal.getByRole('tab', { name: 'Secondary' });
    await primaryTab.click();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(secondaryTab).toHaveAttribute('aria-selected', 'true');
    await primaryTab.click();

    await existingItem().getByLabelText('Label').fill('existing item label');
    await existingItem().getByLabelText('URL').fill('/existing');
    await newItem().getByLabelText('Label').fill('new item label');
    await newItem().getByLabelText('URL').fill('/new');

    await secondaryTab.click();
    const secondary = modal.getByRole('tabpanel').last();
    const secondaryItem = secondary.getByTestId(sel.navigationItemEditor).first();
    await secondaryItem.getByLabelText('Label').fill('existing item 2');
    await secondaryItem.getByLabelText('URL').fill('/existing2');
    const newSecondary = secondary.getByTestId(sel.newNavigationItem);
    await newSecondary.getByLabelText('Label').fill('new item 2');
    await newSecondary.getByLabelText('URL').click();
    await userEvent.keyboard('{Backspace}');
    await newSecondary.getByLabelText('URL').fill('https://google.com');
    await newSecondary.getByLabelText('Label').click();
    await modal.getByRole('button', { name: 'Save' }).click();

    await expect(modal).toHaveCount(0);
    await expect(settingsApi).toHaveEditedSettings([
      {
        key: 'navigation',
        value:
          '[{"url":"/existing/","label":"existing item label"},{"url":"/about/","label":"About"},{"url":"/new/","label":"new item label"}]',
      },
      {
        key: 'secondary_navigation',
        value:
          '[{"url":"/existing2/","label":"existing item 2"},{"url":"https://google.com","label":"new item 2"}]',
      },
    ]);
  });

  it('validates existing items and clears errors while editing', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings/navigation/edit');

    const item = existingItem();
    await item.getByLabelText('Label').fill('');
    await item.getByLabelText('URL').click();
    await userEvent.keyboard('{Backspace}google.com');
    await userEvent.tab();
    await settingsScreen.navigationModal().getByRole('button', { name: 'Save' }).click();
    await expect.element(item).toHaveTextContent(/You must specify a label/);
    await expect.element(item).toHaveTextContent(/You must specify a valid URL or relative path/);

    await item.getByLabelText('Label').click();
    await userEvent.keyboard('A');
    await expect(item.getByText('You must specify a label')).toHaveCount(0);
    await item.getByLabelText('URL').click();
    await userEvent.keyboard('A');
    await expect(item.getByText('You must specify a valid URL or relative path')).toHaveCount(0);
  });

  it('validates and adds a new item', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings/navigation/edit');

    await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(2);
    const item = newItem();
    await item.getByLabelText('Label').fill('');
    await item.getByLabelText('URL').click();
    await userEvent.keyboard('{Backspace}google.com');
    await userEvent.tab();
    await item.getByTestId(sel.addButton).click();
    await expect.element(item).toHaveTextContent(/You must specify a label/);
    await expect.element(item).toHaveTextContent(/You must specify a valid URL or relative path/);

    await item.getByLabelText('Label').fill('Label');
    await item.getByLabelText('URL').click();
    await userEvent.keyboard('{Backspace}');
    await item.getByLabelText('URL').fill('https://google.com');
    await userEvent.tab();
    await item.getByTestId(sel.addButton).click();

    await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(3);
    const added = existingItem(2);
    await expect.element(added.getByLabelText('Label')).toHaveValue('Label');
    await expect.element(added.getByLabelText('URL')).toHaveValue('https://google.com/');
    await expect.element(item.getByLabelText('Label')).toHaveValue('');
    await expect.element(item.getByLabelText('URL')).toHaveValue('');
  });

  it('suggests membership links, offers and content in the URL dropdown', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    fakeOffers([offer({ name: 'Black Friday', code: 'black-friday' })]);
    await renderAdminApp('/settings/navigation/edit', stripeConnectedBoot);

    // Starts empty rather than prefilled with the site root
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('');

    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /Gift subscriptions/ }))
      .toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /Tips and donations/ }))
      .toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /Offer — Black Friday/ }))
      .toBeInTheDocument();
    await expect.element(suggestions().getByRole('option', { name: /^About/ })).toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /^Welcome to Ghost/ }))
      .toBeInTheDocument();

    // Unpublished content is never offered as a destination
    await expect(suggestions().getByRole('option', { name: /Draft thoughts/ })).toHaveCount(0);

    // Typing filters the static links and searches content
    await userEvent.keyboard('gift');
    await expect
      .element(suggestions().getByRole('option', { name: /Gift subscriptions/ }))
      .toBeInTheDocument();
    await expect(suggestions().getByRole('option', { name: /Tips and donations/ })).toHaveCount(0);
    await expect(suggestions().getByRole('option', { name: /^About/ })).toHaveCount(0);

    await suggestions()
      .getByRole('option', { name: /Gift subscriptions/ })
      .click();
    await expect(suggestions()).toHaveCount(0);
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('#/portal/gift');
  });

  it('offers no checkout destinations while Stripe is disconnected', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit');

    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await expect.element(suggestions().getByRole('option', { name: /^About/ })).toBeInTheDocument();
    // Gift and tips open Stripe checkout flows — dead ends without Stripe
    await expect(suggestions().getByRole('option', { name: /Gift subscriptions/ })).toHaveCount(0);
    await expect(suggestions().getByRole('option', { name: /Tips and donations/ })).toHaveCount(0);
  });

  it('adds the item when Enter is pressed in the URL field', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit');

    await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(2);
    await newItem().getByLabelText('Label').fill('Contact');
    await newItem().getByLabelText('URL').click();
    // The typed URL is only committed on Enter, so it has to reach the add
    await userEvent.keyboard('/contact{Enter}');

    await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(3);
    const added = existingItem(2);
    await expect.element(added.getByLabelText('Label')).toHaveValue('Contact');
    await expect.element(added.getByLabelText('URL')).toHaveValue('http://test.com/contact/');
  });

  it('keeps the dropdown shut for a field that already holds a URL', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit');

    // Focusing an existing item offers nothing — it is being reviewed, not filled in
    await existingItem(1).getByLabelText('URL').click();
    await expect(suggestions()).toHaveCount(0);

    // And a typed term that matches nothing shows no empty dropdown either
    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await userEvent.keyboard('zzzzz');
    await expect(suggestions()).toHaveCount(0);
  });

  it('closes the dropdown with Escape without closing the modal', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit');

    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await expect(suggestions()).toHaveCount(0);
    await expect.element(settingsScreen.navigationModal()).toBeInTheDocument();
  });

  it('stores a picked page as a relative URL', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/navigation/edit');

    await newItem().getByLabelText('Label').fill('About us');
    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('abo');
    await suggestions()
      .getByRole('option', { name: /^About/ })
      .click();

    // Shown absolute, stored relative to the site
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('http://test.com/about/');
    await settingsScreen.navigationModal().getByRole('button', { name: 'Save' }).click();

    await expect(settingsScreen.navigationModal()).toHaveCount(0);
    await expect(settingsApi).toHaveEditedSettings([
      {
        key: 'navigation',
        value:
          '[{"url":"/","label":"Home"},{"url":"/about/","label":"About"},{"url":"/about/","label":"About us"}]',
      },
    ]);
  });

  it('selects a suggestion with the keyboard', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', stripeConnectedBoot);

    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('tips');
    // Wait for the debounced search to narrow the list before arrowing into it
    await expect(suggestions().getByRole('option', { name: /Gift subscriptions/ })).toHaveCount(0);
    await expect
      .element(suggestions().getByRole('option', { name: /Tips and donations/ }))
      .toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await expect(suggestions()).toHaveCount(0);
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('#/portal/support');
  });

  it('commits an in-progress URL edit when saving with Cmd+S', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/navigation/edit');

    // The URL only commits on blur — Cmd+S with the field still focused
    // must flush the edit before saving
    await existingItem().getByLabelText('URL').fill('/contact');
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect(settingsScreen.navigationModal()).toHaveCount(0);
    await expect(settingsApi).toHaveEditedSettings([
      {
        key: 'navigation',
        value: '[{"url":"/contact/","label":"Home"},{"url":"/about/","label":"About"}]',
      },
    ]);
  });

  it('confirms before discarding a URL edit closed with Escape', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit');

    // A term that matches nothing keeps the dropdown closed, so this
    // Escape reaches the modal — the typed URL must count as dirty
    await existingItem().getByLabelText('URL').click();
    await userEvent.keyboard('zzz{Escape}');

    await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
    await settingsScreen.confirmationAction('Stay').click();
    await expect.element(settingsScreen.navigationModal()).toBeInTheDocument();
  });

  it('confirms before discarding unsaved changes', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/navigation/edit');

    await newItem().getByLabelText('Label').fill('Label');
    await newItem().getByLabelText('URL').fill('https://google.com');
    await newItem().getByTestId(sel.addButton).click();
    await settingsScreen.navigationModal().getByRole('button', { name: 'Close' }).click();

    await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
    await settingsScreen.confirmationAction('Leave').click();
    await expect(settingsScreen.navigationModal()).toHaveCount(0);
    expect(settingsApi.requests).toHaveLength(0);
  });
});
