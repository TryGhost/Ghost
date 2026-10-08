import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
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

const primaryNavigation = settingsScreen.navigationPrimaryPanel;
const existingItem = (index = 0) => primaryNavigation().itemEditor(index);
const newItem = () => primaryNavigation().newItem();

// The suggestion dropdown renders in a portal, outside the modal
function suggestions() {
  return page.getByRole('listbox', { name: 'URL suggestions' });
}

const aboutPage = { id: 'p1', title: 'About', url: 'http://test.com/about/', status: 'published' };

function fakeSiteContent() {
  fakeSearchIndex({
    pages: [aboutPage],
    posts: [
      { id: 'p2', title: 'Welcome to Ghost', url: 'http://test.com/welcome/', status: 'published' },
      { id: 'p3', title: 'Draft thoughts', url: 'http://test.com/404/', status: 'draft' },
    ],
  });
}

// The default fixture has Stripe disconnected, which hides the checkout links
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

const suggestionsOn = { labs: { navigationUrlSuggestions: true } };

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
    const secondary = settingsScreen.navigationSecondaryPanel();
    const secondaryItem = secondary.itemEditor();
    await secondaryItem.getByLabelText('Label').fill('existing item 2');
    await secondaryItem.getByLabelText('URL').fill('/existing2');
    const newSecondary = secondary.newItem();
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

    await expect(primaryNavigation().itemEditors()).toHaveCount(2);
    const item = newItem();
    await item.getByLabelText('Label').fill('');
    await item.getByLabelText('URL').click();
    await userEvent.keyboard('{Backspace}google.com');
    await userEvent.tab();
    await item.addButton().click();
    await expect.element(item).toHaveTextContent(/You must specify a label/);
    await expect.element(item).toHaveTextContent(/You must specify a valid URL or relative path/);

    await item.getByLabelText('Label').fill('Label');
    await item.getByLabelText('URL').click();
    await userEvent.keyboard('{Backspace}');
    await item.getByLabelText('URL').fill('https://google.com');
    await userEvent.tab();
    await item.addButton().click();

    await expect(primaryNavigation().itemEditors()).toHaveCount(3);
    const added = existingItem(2);
    await expect.element(added.getByLabelText('Label')).toHaveValue('Label');
    await expect.element(added.getByLabelText('URL')).toHaveValue('https://google.com/');
    await expect.element(item.getByLabelText('Label')).toHaveValue('');
    await expect.element(item.getByLabelText('URL')).toHaveValue('http://test.com/');
  });

  it('keeps the URL field plain while navigation URL suggestions are off', async () => {
    fakeSettingsScreens();
    const pages = fakeAdminEndpoint('GET', /^\/search-index\/pages\//, { pages: [] });
    const posts = fakeAdminEndpoint('GET', /^\/search-index\/posts\//, { posts: [] });
    await renderAdminApp('/settings/navigation/edit');

    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('{ArrowDown}');
    await expect(suggestions()).toHaveCount(0);
    expect(pages.requests).toHaveLength(0);
    expect(posts.requests).toHaveLength(0);
  });

  it('suggests site links, offers and content in the URL dropdown', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    fakeOffers([offer({ name: 'Black Friday', code: 'black-friday' })]);
    await renderAdminApp('/settings/navigation/edit', { ...suggestionsOn, ...stripeConnectedBoot });

    // Starts empty rather than prefilled with the site root
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('');

    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /^Homepage/ }))
      .toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /^Free signup/ }))
      .toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /^Paid signup/ }))
      .toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /^Upgrade or change plan/ }))
      .toBeInTheDocument();
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
    // Sharing only makes sense from inside a post
    await expect(suggestions().getByRole('option', { name: /^Share/ })).toHaveCount(0);

    // Typing narrows both the links and the content
    await userEvent.keyboard('gift');
    await expect
      .element(suggestions().getByRole('option', { name: /Gift subscriptions/ }))
      .toBeInTheDocument();
    await expect(suggestions().getByRole('option', { name: /Tips and donations/ })).toHaveCount(0);
    await expect(suggestions().getByRole('option', { name: /^About/ })).toHaveCount(0);
  });

  it('downloads each search index once while suggestions are loading', async () => {
    fakeSettingsScreens();
    let release = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pages = fakeAdminEndpoint('GET', /^\/search-index\/pages\//, async () => {
      await released;
      return { pages: [aboutPage] };
    });
    const posts = fakeAdminEndpoint('GET', /^\/search-index\/posts\//, async () => {
      await released;
      return { posts: [] };
    });
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    // Focusing starts the download, and ArrowDown searches again straight
    // away while nothing is showing yet
    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    release();

    await expect.element(suggestions().getByRole('option', { name: /^About/ })).toBeInTheDocument();
    expect(pages.requests).toHaveLength(1);
    expect(posts.requests).toHaveLength(1);
  });

  it('retries a search index download that failed', async () => {
    fakeSettingsScreens();
    let failNext = true;
    const pages = fakeAdminEndpoint('GET', /^\/search-index\/pages\//, () => {
      if (failNext) {
        failNext = false;
        return new Response(null, { status: 500 });
      }
      return { pages: [aboutPage] };
    });
    fakeAdminEndpoint('GET', /^\/search-index\/posts\//, { posts: [] });
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    await newItem().getByLabelText('URL').click();
    await expect.poll(() => pages.requests.length).toBe(1);
    await userEvent.keyboard('Ab');

    await expect.element(suggestions().getByRole('option', { name: /^About/ })).toBeInTheDocument();
    expect(pages.requests).toHaveLength(2);
  });

  it('suggests content whose path matches what is typed', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('/abo');

    // Wait for the debounced search to replace the list shown on focus
    await expect(suggestions().getByRole('option', { name: /^Welcome to Ghost/ })).toHaveCount(0);
    await expect.element(suggestions().getByRole('option', { name: /^About/ })).toBeInTheDocument();
  });

  it('finds an offer past the first five by typing its name', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    fakeOffers([
      offer({ name: 'Offer One', code: 'one' }),
      offer({ name: 'Offer Two', code: 'two' }),
      offer({ name: 'Offer Three', code: 'three' }),
      offer({ name: 'Offer Four', code: 'four' }),
      offer({ name: 'Offer Five', code: 'five' }),
      offer({ name: 'Offer Six', code: 'six' }),
    ]);
    await renderAdminApp('/settings/navigation/edit', { ...suggestionsOn, ...stripeConnectedBoot });

    await newItem().getByLabelText('URL').click();
    await expect
      .element(suggestions().getByRole('option', { name: /Offer — Offer One/ }))
      .toBeInTheDocument();
    await expect(suggestions().getByRole('option', { name: /Offer — Offer Six/ })).toHaveCount(0);

    await userEvent.keyboard('six');
    await expect
      .element(suggestions().getByRole('option', { name: /Offer — Offer Six/ }))
      .toBeInTheDocument();
  });

  it('offers no checkout destinations while Stripe is disconnected', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await expect.element(suggestions().getByRole('option', { name: /^About/ })).toBeInTheDocument();
    await expect
      .element(suggestions().getByRole('option', { name: /^Free signup/ }))
      .toBeInTheDocument();
    await expect(suggestions().getByRole('option', { name: /^Paid signup/ })).toHaveCount(0);
    await expect(
      suggestions().getByRole('option', { name: /^Upgrade or change plan/ }),
    ).toHaveCount(0);
    await expect(suggestions().getByRole('option', { name: /Gift subscriptions/ })).toHaveCount(0);
    await expect(suggestions().getByRole('option', { name: /Tips and donations/ })).toHaveCount(0);
  });

  it('offers no signup destinations when members signup is invite-only', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', {
      ...suggestionsOn,
      boot: {
        browseSettings: {
          response: settingsResponse({
            settings: {
              stripe_connect_publishable_key: 'pk_test_123',
              stripe_connect_secret_key: 'sk_test_123',
              members_signup_access: 'invite',
            },
          }),
        },
      },
    });

    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await expect(suggestions().getByRole('option', { name: /^Free signup/ })).toHaveCount(0);
    await expect(suggestions().getByRole('option', { name: /^Paid signup/ })).toHaveCount(0);
    await expect
      .element(suggestions().getByRole('option', { name: /Gift subscriptions/ }))
      .toBeInTheDocument();
  });

  it('adds the item when Enter is pressed in the URL field', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(2);
    await newItem().getByLabelText('Label').fill('Contact');
    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('/contact{Enter}');

    await expect(primaryNavigation().getByTestId(sel.navigationItemEditor)).toHaveCount(3);
    const added = existingItem(2);
    await expect.element(added.getByLabelText('Label')).toHaveValue('Contact');
    await expect.element(added.getByLabelText('URL')).toHaveValue('http://test.com/contact/');
    await expect.element(newItem().getByLabelText('Label')).toHaveValue('');
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('');
  });

  it('keeps the typed URL when Enter fails validation', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('/contact{Enter}');

    await expect.element(newItem()).toHaveTextContent(/You must specify a label/);
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('http://test.com/contact/');
  });

  it('leaves the URL as typed until the field loses focus', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings/navigation/edit');

    // Saved as '/con/' on every keystroke, but not reformatted mid-word
    await newItem().getByLabelText('URL').clear();
    await userEvent.keyboard('/con');
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('/con');
    await userEvent.keyboard('tact');
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('/contact');

    await userEvent.tab();
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('http://test.com/contact/');
  });

  it('keeps the dropdown shut for a field that already holds a URL until ArrowDown', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    // The existing About item, shown as http://test.com/about/
    await existingItem(1).getByLabelText('URL').click();
    await expect(suggestions()).toHaveCount(0);
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(suggestions().getByRole('option', { name: /^About/ })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await expect(suggestions()).toHaveCount(0);

    // Text that matches nothing shows no empty dropdown
    await newItem().getByLabelText('URL').click();
    await expect.element(suggestions()).toBeInTheDocument();
    await userEvent.keyboard('zzzzz');
    await expect(suggestions()).toHaveCount(0);
  });

  it('closes the dropdown with Escape without closing the modal', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

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
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

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
    await renderAdminApp('/settings/navigation/edit', { ...suggestionsOn, ...stripeConnectedBoot });

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

  it('confirms before discarding a URL edit closed with Escape', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    // Text that matches nothing keeps the dropdown shut, so Escape reaches the modal
    await existingItem().getByLabelText('URL').click();
    await userEvent.keyboard('zzz{Escape}');

    await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
    await settingsScreen.confirmationAction('Stay').click();
    await expect.element(settingsScreen.navigationModal()).toBeInTheDocument();
  });

  it('saves URLs that are still being typed with Cmd+S', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/navigation/edit');

    await existingItem().getByLabelText('URL').fill('/home');
    await newItem().getByLabelText('Label').fill('Contact');
    await newItem().getByLabelText('URL').clear();
    await userEvent.keyboard('/contact');
    await expect.element(newItem().getByLabelText('URL')).toHaveValue('/contact');
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect(settingsScreen.navigationModal()).toHaveCount(0);
    await expect(settingsApi).toHaveEditedSettings([
      {
        key: 'navigation',
        value:
          '[{"url":"/home/","label":"Home"},{"url":"/about/","label":"About"},{"url":"/contact/","label":"Contact"}]',
      },
    ]);
  });

  it('confirms before discarding a URL typed into the new item with Escape', async () => {
    fakeSettingsScreens();
    fakeSiteContent();
    await renderAdminApp('/settings/navigation/edit', suggestionsOn);

    await newItem().getByLabelText('URL').click();
    await userEvent.keyboard('zzz');
    // Wait for the debounced search to close the list, so Escape reaches the modal
    await expect(suggestions()).toHaveCount(0);
    await userEvent.keyboard('{Escape}');

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
    await newItem().addButton().click();
    await settingsScreen.navigationModal().getByRole('button', { name: 'Close' }).click();

    await expect.element(settingsScreen.confirmationModal()).toHaveTextContent(/leave/i);
    await settingsScreen.confirmationAction('Leave').click();
    await expect(settingsScreen.navigationModal()).toHaveCount(0);
    expect(settingsApi.requests).toHaveLength(0);
  });
});
