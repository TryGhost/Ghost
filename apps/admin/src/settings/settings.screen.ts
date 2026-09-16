import { page, type Locator } from 'vitest/browser';
import * as sel from '@tryghost/test-data/selectors/settings';

const toast = () => page.getByRole('region', { name: /Notifications/ }).getByRole('listitem');

/** A navigation-editor tabpanel augmented with factories for its parts — still a locator. */
export type NavigationPanelScope = Locator & {
  itemEditors(): Locator;
  itemEditor(index?: number): Locator;
  newItem(): NavigationItemScope;
};

export type NavigationItemScope = Locator & {
  addButton(): Locator;
};

function navigationItemScope(item: Locator): NavigationItemScope {
  return Object.assign(item, {
    addButton: () => item.getByTestId(sel.addButton),
  });
}

function navigationPanelScope(panel: Locator): NavigationPanelScope {
  return Object.assign(panel, {
    itemEditors: () => panel.getByTestId(sel.navigationItemEditor),
    itemEditor: (index = 0) => panel.getByTestId(sel.navigationItemEditor).nth(index),
    newItem: () => navigationItemScope(panel.getByTestId(sel.newNavigationItem)),
  });
}

/** Settings locators and gestures shared by the acceptance batches; no assertions. */
export const settingsScreen = {
  section: (testId: string) => page.getByTestId(testId),
  titleAndDescription: () => page.getByTestId(sel.titleAndDescription),
  design: () => page.getByTestId(sel.design),
  users: () => page.getByTestId(sel.users),
  portal: () => page.getByTestId(sel.portal),
  explore: () => page.getByTestId(sel.explore),
  network: () => page.getByTestId(sel.network),
  tipsAndDonations: () => page.getByTestId(sel.tipsAndDonations),
  publicationLanguage: () => page.getByTestId(sel.publicationLanguage),
  timezone: () => page.getByTestId(sel.timezone),
  socialAccounts: () => page.getByTestId(sel.socialAccounts),
  seoMeta: () => page.getByTestId(sel.seoMeta),
  localeSelect: () => page.getByTestId(sel.localeSelect),
  timezoneSelect: () => page.getByTestId(sel.timezoneSelect),
  seoTabView: () => page.getByTestId(sel.seoTabView),
  selectOption: (name: string) => page.getByRole('option').filter({ hasText: name }),
  selectOptionExact: (name: string) =>
    page.getByRole('option', {
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`),
    }),
  tierOption: (name: string) =>
    page.getByRole('listbox').getByRole('option', { name, exact: true }),
  errorToast: toast,
  successToast: toast,
  inviteUserModal: () => page.getByTestId(sel.inviteUserModal),
  limitModal: () => page.getByTestId(sel.limitModal),
  enableNewsletters: () => page.getByTestId(sel.enableNewsletters),
  defaultRecipients: () => page.getByTestId(sel.defaultRecipients),
  defaultRecipientsSelect: () => page.getByTestId(sel.defaultRecipientsSelect),
  emails: () => page.getByTestId(sel.emails),
  memberEmails: () => page.getByTestId(sel.memberEmails),
  newsletters: () => page.getByTestId(sel.newsletters),
  mailgun: () => page.getByTestId(sel.mailgun),
  addNewsletterModal: () => page.getByTestId(sel.addNewsletterModal),
  newsletterModal: () => page.getByTestId(sel.newsletterModal),
  infoToast: toast,
  notification: (text: string) =>
    page.getByRole('region', { name: /Notifications/ }).getByText(text, { exact: true }),
  access: () => page.getByTestId(sel.access),
  customFields: () => page.getByTestId(sel.customFields),
  customFieldModal: () => page.getByTestId(sel.customFieldModal),
  stripeModal: () => page.getByTestId(sel.stripeModal),
  tiers: () => page.getByTestId(sel.tiers),
  tierDetailModal: () => page.getByTestId(sel.tierDetailModal),
  analytics: () => page.getByTestId(sel.analytics),
  navigation: () => page.getByTestId(sel.navigation),
  navigationModal: () => page.getByTestId(sel.navigationModal),
  navigationPrimaryPanel: () =>
    navigationPanelScope(settingsScreen.navigationModal().getByRole('tabpanel').first()),
  navigationSecondaryPanel: () =>
    navigationPanelScope(settingsScreen.navigationModal().getByRole('tabpanel').last()),
  announcementBar: () => page.getByTestId(sel.announcementBar),
  announcementBarModal: () => page.getByTestId(sel.announcementBarModal),
  announcementBarPreviewIframe: () => page.getByTestId(sel.announcementBarPreviewIframe),
  designModal: () => page.getByTestId(sel.designModal),
  designToolbar: () => page.getByTestId(sel.designToolbar),
  designSettingTabs: () => {
    const tabs = page.getByTestId(sel.designSettingTabs);
    // The compact brand form renders the color picker where the tabs would
    // be, so the picker is also reachable as a part of this scope.
    return Object.assign(tabs, {
      accentColorPicker: () => tabs.getByTestId(sel.accentColorPicker),
    });
  },
  previewMobile: () => page.getByTestId(sel.previewMobile),
  accentColorPicker: () => page.getByTestId(sel.accentColorPicker),
  toggleUnsplashButton: () => page.getByTestId(sel.toggleUnsplashButton),
  headingFontSelect: () => page.getByTestId(sel.headingFontSelect),
  bodyFontSelect: () => page.getByTestId(sel.bodyFontSelect),
  welcomeEmailModal: () => page.getByTestId(sel.welcomeEmailModal),
  welcomeEmailCustomizeModal: () => page.getByTestId(sel.welcomeEmailCustomizeModal),
  welcomeEmailDirtyConfirmModal: () => page.getByTestId(sel.welcomeEmailDirtyConfirmModal),
  welcomeEmailModeEdit: () => page.getByTestId(sel.welcomeEmailModeEdit),
  welcomeEmailModePreview: () => page.getByTestId(sel.welcomeEmailModePreview),
  welcomeEmailPreviewSubject: () => page.getByTestId(sel.welcomeEmailPreviewSubject),
  welcomeEmailPreviewIframe: () => page.getByTestId(sel.welcomeEmailPreviewIframe),
  welcomeEmailPreviewError: () => page.getByTestId(sel.welcomeEmailPreviewError),
  welcomeEmailPreviewLoading: () => page.getByTestId(sel.welcomeEmailPreviewLoading),
  freeWelcomeEmailPreview: () =>
    settingsScreen.memberEmails().getByTestId(sel.freeWelcomeEmailPreview),
  freeWelcomeEmailTitle: () => settingsScreen.memberEmails().getByTestId(sel.freeWelcomeEmailTitle),
  paidWelcomeEmailRow: () => settingsScreen.memberEmails().getByTestId(sel.paidWelcomeEmailRow),
  testEmailDropdown: () => page.getByTestId(sel.testEmailDropdown),
  automationsTransactionalRow: () => page.getByTestId(sel.automationsTransactionalRow),
  /** Koenig editor surfaces inside the welcome-email modal. */
  slashMenuItem: (label: string) => page.getByText(label, { exact: true }),
  embedIframe: () => page.getByTestId(sel.embedIframe),
  bookmarkUrl: () => page.getByTestId(sel.bookmarkUrl),
  bookmarkTitle: () => page.getByTestId(sel.bookmarkTitle),
  /** A rendered Koenig card by its data-kg-card marker — editor DOM no accessible locator reaches. */
  koenigCard: (card: string): Locator | null => {
    const element = document.querySelector<HTMLElement>(`[data-kg-card="${card}"]`);
    return element && page.elementLocator(element);
  },
  theme: () => page.getByTestId(sel.theme),
  themeModal: () => page.getByTestId(sel.themeModal),
  themeListItems: () => settingsScreen.themeModal().getByTestId(sel.themeListItem),
  themeCodeEditorModal: () => page.getByTestId(sel.themeCodeEditorModal),
  themeEditorConfirmModal: () => page.getByTestId(sel.themeEditorConfirmModal),
  themeEditorInputModal: () => page.getByTestId(sel.themeEditorInputModal),
  menu: () => page.getByRole('menu'),
  menuItem: (name: string) => page.getByRole('menuitem', { name }),
  sidebar: () => page.getByTestId(sel.settingsSidebar),
  search: () => page.getByRole('textbox', { name: sel.settingsSearchLabel, exact: true }),
  exitButton: () => page.getByTestId(sel.exitSettings),
  confirmationModal: () => page.getByTestId(sel.confirmationModal),
  confirmationAction: (name: 'Leave' | 'Stay') =>
    settingsScreen.confirmationModal().getByRole('button', { name }),
  portalModal: () => page.getByTestId(sel.portalModal),
  userDetailModal: () => page.getByTestId(sel.userDetailModal),
  exploreToggle: () => page.getByTestId(sel.exploreToggle),
  exploreGrowthToggle: () => page.getByTestId(sel.exploreGrowthToggle),
  explorePreview: () => page.getByTestId(sel.explorePreview),
  testimonialsModal: () => page.getByTestId(sel.exploreTestimonialsModal),
  migratedFromSelect: () => page.getByTestId(sel.migratedFrom),
  testimonialContent: () => page.getByPlaceholder(sel.testimonialPlaceholder),
  donateUrl: () => settingsScreen.tipsAndDonations().getByTestId(sel.donateUrl),
  previewShareableLink: () =>
    settingsScreen.tipsAndDonations().getByTestId(sel.previewShareableLink),
  copyShareableLink: () => settingsScreen.tipsAndDonations().getByTestId(sel.copyShareableLink),
  suggestedAmount: () =>
    settingsScreen.tipsAndDonations().getByRole('textbox', { name: sel.suggestedAmountLabel }),
  navItem: (name: string) => settingsScreen.sidebar().getByText(name, { exact: true }),
  noSearchResults: () =>
    settingsScreen.sidebar().getByText(sel.noSearchResultsText, { exact: true }),

  async editTitle(value: string): Promise<void> {
    const section = settingsScreen.titleAndDescription();
    await section.getByRole('button', { name: 'Edit' }).click();
    await section.getByLabelText(sel.siteTitleLabel).fill(value);
  },
};
