import { Locator, Page } from '@playwright/test';
import {
  addFacebookImageLabel,
  addXImageLabel,
  codeInjectionFootLabel,
  codeInjectionHeadLabel,
  facebookImageUnsplashButton,
  postHistoryModal,
  postHistoryPreview,
  postHistoryPreviewBody,
  postHistoryPreviewExcerpt,
  postHistoryPreviewFeatureImage,
  postHistoryPreviewTitle,
  postHistoryRestoreConfirm,
  postHistoryRevisionList,
  postSettingsSidebar,
  removeFacebookImageButton,
  removeXImageButton,
  restoreRevisionButton,
  settingsAuthorChip,
  settingsAuthorsError,
  settingsAuthorsList,
  settingsAuthorsPicker,
  settingsCodeInjectionBackButton,
  settingsCodeInjectionRow,
  settingsDeleteButton,
  settingsDeleteCancelButton,
  settingsDeleteConfirmButton,
  settingsDeleteDialog,
  settingsDeleteError,
  settingsExcerptInput,
  settingsFacebookCardBackButton,
  settingsFacebookCardRow,
  settingsFacebookDescriptionInput,
  settingsFacebookPreview,
  settingsFacebookPreviewImage,
  settingsFacebookTitleInput,
  settingsFeaturedToggle,
  settingsKeyboardShortcutsBackButton,
  settingsKeyboardShortcutsRow,
  settingsLoadError,
  settingsMetaDataBackButton,
  settingsMetaDataRow,
  settingsMetaDescriptionInput,
  settingsMetaTitleInput,
  settingsPostHistoryButton,
  settingsPublishDate,
  settingsPublishDateError,
  settingsPublishDateNote,
  settingsPublishTime,
  settingsSerpPreview,
  settingsShortcutRow,
  settingsShowTitleToggle,
  settingsShowTitleWarning,
  settingsSlugError,
  settingsSlugInput,
  settingsSubviewPane,
  settingsTagsCreateText,
  settingsTagsField,
  settingsTagsInput,
  settingsTagsList,
  settingsTagsToken,
  settingsTemplateSelect,
  settingsTemplateSlugMatch,
  settingsTiersError,
  settingsTiersPicker,
  settingsUrlPreview,
  settingsVisibilitySelect,
  settingsXCardBackButton,
  settingsXCardRow,
  settingsXDescriptionInput,
  settingsXImage,
  settingsXPreview,
  settingsXPreviewImage,
  settingsXTitleInput,
  showTitleLearnMoreLink,
  xImageUnsplashButton,
} from '@tryghost/test-data/selectors/editor';

/** The React sidebar's sections, in the order it renders them. */
export type PostSettingsSectionId =
  | 'url'
  | 'publish-date'
  | 'tags'
  | 'access'
  | 'excerpt'
  | 'authors'
  | 'template'
  | 'show-title-and-feature-image'
  | 'featured'
  | 'post-history'
  | 'code-injection'
  | 'meta-data'
  | 'x-card'
  | 'facebook-card'
  | 'keyboard-shortcuts'
  | 'delete';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches an element whose whole text is `text`, so "News" never matches "Breaking News". */
function wholeText(text: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`);
}

/** Long enough for a section to render, short enough that a missing one fails before the test times out. */
const PRESENCE_TIMEOUT = 5000;

// react-day-picker's default English labels: the grid is "March 2026", a day
// "Tuesday, March 10th, 2026", and the nav buttons are named below.
const CALENDAR_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const CALENDAR_PREVIOUS_MONTH = 'Go to the Previous Month';
const CALENDAR_NEXT_MONTH = 'Go to the Next Month';
/** Ten years either way; a target further off is a mistake, not a long walk. */
const MAX_CALENDAR_STEPS = 120;

async function expectPresent(locator: Locator, message: string): Promise<void> {
  try {
    await locator.waitFor({ state: 'visible', timeout: PRESENCE_TIMEOUT });
  } catch (error) {
    throw new Error(message, { cause: error as Error });
  }
}

function missingSection(id: PostSettingsSectionId, reason?: string): string {
  return `Settings section "${id}" is not in the sidebar${reason ? `: ${reason}` : ''}.`;
}

/** Radix renders the options in a portal and marks the trigger aria-expanded while they show. */
async function chooseSelectOption(page: Page, trigger: Locator, label: string): Promise<void> {
  await trigger.click();
  const openTrigger = trigger.and(page.locator('[aria-expanded="true"]'));
  await openTrigger.waitFor({ state: 'visible' });
  const listboxId = await openTrigger.getAttribute('aria-controls');
  await page
    .locator(`[id="${listboxId}"]`)
    .getByRole('option', { name: label, exact: true })
    .click();
}

/** Every section opens and closes; a section drawn inline in the list has nothing to close. */
interface SettingsSectionObject {
  open(): Promise<void>;
  close(): Promise<void>;
}

/**
 * A section drawn inline in the section list. Opening it opens the sidebar and
 * brings the section's anchor into view.
 */
abstract class InlineSection implements SettingsSectionObject {
  protected readonly page: Page;
  protected readonly sidebar: PostSettingsSidebar;
  private readonly id: PostSettingsSectionId;

  protected constructor(page: Page, sidebar: PostSettingsSidebar, id: PostSettingsSectionId) {
    this.page = page;
    this.sidebar = sidebar;
    this.id = id;
  }

  /** The element that marks where the section sits in the list. */
  protected abstract anchor(): Locator;

  /** Why the list can leave the section out, for the error when it does. */
  protected absentReason(): string | undefined {
    return undefined;
  }

  async open(): Promise<void> {
    await this.sidebar.showSectionList();
    await expectPresent(this.anchor(), missingSection(this.id, this.absentReason()));
    await this.anchor().scrollIntoViewIfNeeded();
  }

  async close(): Promise<void> {}
}

/** A section that is a row in the list and opens a pane over the rest of it. */
abstract class PaneSection implements SettingsSectionObject {
  readonly row: Locator;
  readonly backButton: Locator;
  readonly pane: Locator;
  protected readonly sidebar: PostSettingsSidebar;
  private readonly id: PostSettingsSectionId;

  protected constructor(
    page: Page,
    sidebar: PostSettingsSidebar,
    id: PostSettingsSectionId,
    { rowLabel, backLabel }: { rowLabel: string; backLabel: string },
  ) {
    this.sidebar = sidebar;
    this.id = id;
    this.row = sidebar.root.getByRole('button', { name: rowLabel, exact: true });
    this.backButton = sidebar.root.getByRole('button', { name: backLabel, exact: true });
    this.pane = page.getByTestId(settingsSubviewPane);
  }

  async isOpen(): Promise<boolean> {
    return this.backButton.isVisible();
  }

  /** Leaves any other open pane first: the list is hidden while one is. */
  async open(): Promise<void> {
    await this.sidebar.open();
    if (await this.isOpen()) {
      return;
    }
    await this.sidebar.showSectionList();
    await expectPresent(this.row, missingSection(this.id));
    await this.row.click();
    await this.backButton.waitFor({ state: 'visible' });
  }

  /** The back button blurs the focused field first, so it commits the edit. */
  async close(): Promise<void> {
    await expectPresent(
      this.backButton,
      `Settings pane "${this.id}" is not open, so it cannot be closed.`,
    );
    await this.backButton.click();
    await this.row.waitFor({ state: 'visible' });
  }
}

class UrlSection extends InlineSection {
  readonly slugInput: Locator;
  readonly slugError: Locator;
  readonly preview: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'url');
    this.slugInput = page.getByTestId(settingsSlugInput);
    this.slugError = page.getByTestId(settingsSlugError);
    this.preview = page.getByTestId(settingsUrlPreview);
  }

  protected anchor(): Locator {
    return this.slugInput;
  }

  async setSlug(slug: string): Promise<void> {
    await this.slugInput.fill(slug);
    await this.slugInput.blur();
  }
}

class PublishDateSection extends InlineSection {
  /** Read-only: the date is chosen from a calendar popover. */
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly error: Locator;
  readonly note: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'publish-date');
    this.dateInput = page.getByTestId(settingsPublishDate);
    this.timeInput = page.getByTestId(settingsPublishTime);
    this.error = page.getByTestId(settingsPublishDateError);
    this.note = page.getByTestId(settingsPublishDateNote);
  }

  protected anchor(): Locator {
    return this.dateInput;
  }

  /**
   * Chooses `YYYY-MM-DD` in the calendar popover behind the read-only date
   * field, paging month by month from wherever the calendar opens.
   */
  async setDate(day: string): Promise<void> {
    const [year, month, date] = day.split('-').map(Number);
    const monthName = CALENDAR_MONTHS[month - 1];

    await this.dateInput.click();
    const openInput = this.dateInput.and(this.page.locator('[aria-expanded="true"]'));
    await openInput.waitFor({ state: 'visible' });
    const calendarId = await openInput.getAttribute('aria-controls');
    const calendar = this.page.locator(`[id="${calendarId}"]`);

    const targetGrid = calendar.getByRole('grid', { name: `${monthName} ${year}`, exact: true });
    for (let step = 0; step < MAX_CALENDAR_STEPS && !(await targetGrid.isVisible()); step++) {
      const shown = await calendar.getByRole('grid').getAttribute('aria-label');
      const [shownMonth, shownYear] = (shown ?? '').split(' ');
      const shownIndex = Number(shownYear) * 12 + CALENDAR_MONTHS.indexOf(shownMonth);
      const targetIndex = year * 12 + (month - 1);
      await calendar
        .getByRole('button', {
          name: targetIndex < shownIndex ? CALENDAR_PREVIOUS_MONTH : CALENDAR_NEXT_MONTH,
          exact: true,
        })
        .click();
    }
    await targetGrid.waitFor({ state: 'visible' });

    const dayName = new RegExp(`\\b${monthName} ${date}(st|nd|rd|th), ${year}\\b`);
    const dayButton = targetGrid.getByRole('button', { name: dayName });
    await dayButton.waitFor({ state: 'visible' });
    if (await dayButton.isDisabled()) {
      throw new Error(
        `The calendar does not offer ${day}: the Publish date section stops at today in the site timezone.`,
      );
    }

    // react-day-picker deselects a re-clicked day and the picker then leaves
    // the popover open, so the displayed day is closed over, not clicked.
    const selectedDay = targetGrid.getByRole('gridcell', { selected: true }).getByRole('button', {
      name: dayName,
    });
    if ((await selectedDay.count()) > 0) {
      await this.page.keyboard.press('Escape');
    } else {
      await dayButton.click();
    }
    await calendar.waitFor({ state: 'hidden' });
  }

  /** Types `HH:mm` and commits it on blur. */
  async setTime(time: string): Promise<void> {
    await this.timeInput.fill(time);
    await this.timeInput.blur();
  }
}

class TagsSection extends InlineSection {
  readonly field: Locator;
  readonly input: Locator;
  readonly list: Locator;
  readonly tokens: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'tags');
    this.field = page.getByTestId(settingsTagsField);
    this.input = page.getByTestId(settingsTagsInput);
    this.list = page.getByTestId(settingsTagsList);
    this.tokens = page.getByTestId(settingsTagsToken);
  }

  protected anchor(): Locator {
    return this.field;
  }

  /** An existing tag's row; its accessible name also carries the slug. */
  option(name: string): Locator {
    return this.list
      .getByRole('option')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  createOption(name: string): Locator {
    return this.list
      .getByRole('option')
      .filter({ hasText: settingsTagsCreateText })
      .filter({ hasText: name });
  }

  token(name: string): Locator {
    return this.tokens.filter({ hasText: wholeText(name) });
  }

  /** Picks the existing tag of that name, or creates it when the site has none. */
  async add(name: string): Promise<void> {
    await this.input.fill(name);
    await this.option(name).or(this.createOption(name)).first().click();
    await this.token(name).waitFor({ state: 'visible' });
  }

  /** A chip is removed by clicking it. */
  async remove(name: string): Promise<void> {
    await this.token(name).click();
    await this.token(name).waitFor({ state: 'detached' });
  }
}

class AccessSection extends InlineSection {
  readonly visibilitySelect: Locator;
  readonly tiersPicker: Locator;
  readonly tiersError: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'access');
    this.visibilitySelect = page.getByTestId(settingsVisibilitySelect);
    this.tiersPicker = page.getByTestId(settingsTiersPicker);
    this.tiersError = page.getByTestId(settingsTiersError);
  }

  protected anchor(): Locator {
    return this.visibilitySelect;
  }

  tier(name: string): Locator {
    return this.tiersPicker.getByRole('checkbox', { name, exact: true });
  }

  /** `label` is the option as the select shows it. */
  async setVisibility(label: string): Promise<void> {
    await chooseSelectOption(this.page, this.visibilitySelect, label);
  }

  /** Ticks a tier in the picker that `Specific tier(s)` shows. */
  async selectTier(name: string): Promise<void> {
    await this.tier(name).check();
  }

  async deselectTier(name: string): Promise<void> {
    await this.tier(name).uncheck();
  }
}

class ExcerptSection extends InlineSection {
  readonly input: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'excerpt');
    this.input = page.getByTestId(settingsExcerptInput);
  }

  protected anchor(): Locator {
    return this.input;
  }

  async fill(excerpt: string): Promise<void> {
    await this.input.fill(excerpt);
    await this.input.blur();
  }
}

class AuthorsSection extends InlineSection {
  readonly picker: Locator;
  readonly input: Locator;
  readonly list: Locator;
  readonly chips: Locator;
  readonly error: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'authors');
    this.picker = page.getByTestId(settingsAuthorsPicker);
    this.input = this.picker.getByRole('combobox');
    this.list = page.getByTestId(settingsAuthorsList);
    this.chips = page.getByTestId(settingsAuthorChip);
    this.error = page.getByTestId(settingsAuthorsError);
  }

  protected anchor(): Locator {
    return this.picker;
  }

  /** A staff member's row; its accessible name also carries their email. */
  option(name: string): Locator {
    return this.list
      .getByRole('option')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  chip(name: string): Locator {
    return this.chips.filter({ hasText: wholeText(name) });
  }

  async add(name: string): Promise<void> {
    await this.input.fill(name);
    await this.option(name).click();
    await this.chip(name).waitFor({ state: 'visible' });
  }

  /** A chip is removed by clicking it. */
  async remove(name: string): Promise<void> {
    await this.chip(name).click();
    await this.chip(name).waitFor({ state: 'detached' });
  }
}

/** Absent unless the active theme offers custom templates. */
class TemplateSection extends InlineSection {
  readonly select: Locator;
  readonly slugMatch: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'template');
    this.select = page.getByTestId(settingsTemplateSelect);
    this.slugMatch = page.getByTestId(settingsTemplateSlugMatch);
  }

  protected anchor(): Locator {
    return this.select;
  }

  protected absentReason(): string {
    return 'it only renders when the active theme offers custom templates';
  }

  /** `label` is the template as the select shows it. */
  async choose(label: string): Promise<void> {
    await chooseSelectOption(this.page, this.select, label);
  }
}

/** Pages only: the post editor leaves this section out. */
class ShowTitleSection extends InlineSection {
  readonly toggle: Locator;
  readonly warning: Locator;
  readonly learnMoreLink: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'show-title-and-feature-image');
    this.toggle = page.getByTestId(settingsShowTitleToggle);
    this.warning = page.getByTestId(settingsShowTitleWarning);
    this.learnMoreLink = this.warning.getByRole('link', { name: showTitleLearnMoreLink });
  }

  protected anchor(): Locator {
    return this.toggle;
  }

  protected absentReason(): string {
    return 'only the page editor renders it';
  }
}

class FeaturedSection extends InlineSection {
  readonly toggle: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'featured');
    this.toggle = page.getByTestId(settingsFeaturedToggle);
  }

  protected anchor(): Locator {
    return this.toggle;
  }
}

/** One saved version in the history list, with the controls it carries. */
class PostHistoryRevision {
  readonly row: Locator;
  readonly selectButton: Locator;
  readonly restoreButton: Locator;

  constructor(row: Locator) {
    this.row = row;
    // Named by the version's date, tags and author; the row's only other button is Restore.
    this.selectButton = row.getByRole('button', {
      name: new RegExp(`^(?!${escapeRegExp(restoreRevisionButton)}$)`),
    });
    this.restoreButton = row.getByRole('button', { name: restoreRevisionButton, exact: true });
  }

  async select(): Promise<void> {
    await this.selectButton.click();
  }
}

class PostHistoryModal {
  private readonly page: Page;
  readonly modal: Locator;
  readonly revisions: Locator;
  readonly preview: Locator;
  readonly previewTitle: Locator;
  readonly previewExcerpt: Locator;
  readonly previewFeatureImage: Locator;
  readonly previewBody: Locator;
  readonly restoreConfirm: Locator;
  readonly confirmRestoreButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId(postHistoryModal);
    this.revisions = page.getByTestId(postHistoryRevisionList).getByRole('listitem');
    this.preview = page.getByTestId(postHistoryPreview);
    this.previewTitle = page.getByTestId(postHistoryPreviewTitle);
    this.previewExcerpt = page.getByTestId(postHistoryPreviewExcerpt);
    this.previewFeatureImage = page.getByTestId(postHistoryPreviewFeatureImage);
    this.previewBody = page.getByTestId(postHistoryPreviewBody);
    this.restoreConfirm = page.getByTestId(postHistoryRestoreConfirm);
    this.confirmRestoreButton = this.restoreConfirm.getByRole('button', {
      name: restoreRevisionButton,
      exact: true,
    });
  }

  /** Newest first: index 0 is the latest version. */
  revision(index: number): PostHistoryRevision {
    return new PostHistoryRevision(this.revisions.nth(index));
  }

  /**
   * Restores a version and waits for the history to close, which it does once
   * the save lands. Only the selected row offers Restore, and never the newest.
   */
  async restore(index: number): Promise<void> {
    const revision = this.revision(index);
    await revision.select();
    await revision.restoreButton.click();
    await this.confirmRestoreButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.modal.waitFor({ state: 'hidden' });
  }
}

/** A row that opens the history dialog rather than a pane. */
class PostHistorySection implements SettingsSectionObject {
  readonly button: Locator;
  readonly history: PostHistoryModal;
  private readonly sidebar: PostSettingsSidebar;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    this.sidebar = sidebar;
    this.button = page.getByTestId(settingsPostHistoryButton);
    this.history = new PostHistoryModal(page);
  }

  async open(): Promise<void> {
    await this.sidebar.showSectionList();
    await expectPresent(
      this.button,
      missingSection(
        'post-history',
        'it only renders for a post with a saved lexical body that is not email-only',
      ),
    );
    await this.button.click();
    await this.history.modal.waitFor({ state: 'visible' });
  }

  async close(): Promise<void> {
    await expectPresent(this.history.modal, 'Post history is not open, so it cannot be closed.');
    await this.history.close();
  }
}

class CodeInjectionPane extends PaneSection {
  /** CodeMirror exposes its content as a textbox named by the editor's label. */
  readonly headCode: Locator;
  readonly footCode: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'code-injection', {
      rowLabel: settingsCodeInjectionRow,
      backLabel: settingsCodeInjectionBackButton,
    });
    this.headCode = page.getByRole('textbox', { name: new RegExp(`^${codeInjectionHeadLabel}`) });
    this.footCode = page.getByRole('textbox', { name: new RegExp(`^${codeInjectionFootLabel}`) });
  }

  /** Replaces the header code; an empty string clears it. */
  async setHead(code: string): Promise<void> {
    await replaceCode(this.headCode, code);
  }

  /** Replaces the footer code; an empty string clears it. */
  async setFoot(code: string): Promise<void> {
    await replaceCode(this.footCode, code);
  }
}

/**
 * Clears through CodeMirror's own keymap first: a fill writes to the DOM,
 * which races its reconciliation. Blurs to commit, as the text fields do.
 */
async function replaceCode(field: Locator, code: string): Promise<void> {
  await field.click();
  const { keyboard } = field.page();
  await keyboard.press('ControlOrMeta+a');
  await keyboard.press('Backspace');
  if (code) {
    await field.fill(code);
  }
  await field.blur();
}

class MetaDataPane extends PaneSection {
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly searchPreview: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'meta-data', {
      rowLabel: settingsMetaDataRow,
      backLabel: settingsMetaDataBackButton,
    });
    this.titleInput = page.getByTestId(settingsMetaTitleInput);
    this.descriptionInput = page.getByTestId(settingsMetaDescriptionInput);
    this.searchPreview = page.getByTestId(settingsSerpPreview);
  }

  async setTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.titleInput.blur();
  }

  async setDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
    await this.descriptionInput.blur();
  }
}

interface SocialCardSelectors {
  id: PostSettingsSectionId;
  rowLabel: string;
  backLabel: string;
  titleInput: string;
  descriptionInput: string;
  preview: string;
  previewImage: string;
  addImageLabel: string;
  unsplashButton: string;
  removeImageButton: string;
}

class SocialCardPane extends PaneSection {
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly preview: Locator;
  readonly previewImage: Locator;
  readonly imageInput: Locator;
  readonly unsplashButton: Locator;
  readonly removeImageButton: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar, selectors: SocialCardSelectors) {
    super(page, sidebar, selectors.id, {
      rowLabel: selectors.rowLabel,
      backLabel: selectors.backLabel,
    });
    this.titleInput = page.getByTestId(selectors.titleInput);
    this.descriptionInput = page.getByTestId(selectors.descriptionInput);
    this.preview = page.getByTestId(selectors.preview);
    this.previewImage = page.getByTestId(selectors.previewImage);
    this.imageInput = this.pane.getByLabel(selectors.addImageLabel, { exact: true });
    this.unsplashButton = this.pane.getByRole('button', {
      name: selectors.unsplashButton,
      exact: true,
    });
    this.removeImageButton = this.pane.getByRole('button', {
      name: selectors.removeImageButton,
      exact: true,
    });
  }

  async setTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.titleInput.blur();
  }

  async setDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
    await this.descriptionInput.blur();
  }

  async uploadImage(filePath: string): Promise<void> {
    await this.imageInput.setInputFiles(filePath);
  }
}

class XCardPane extends SocialCardPane {
  readonly image: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, {
      id: 'x-card',
      rowLabel: settingsXCardRow,
      backLabel: settingsXCardBackButton,
      titleInput: settingsXTitleInput,
      descriptionInput: settingsXDescriptionInput,
      preview: settingsXPreview,
      previewImage: settingsXPreviewImage,
      addImageLabel: addXImageLabel,
      unsplashButton: xImageUnsplashButton,
      removeImageButton: removeXImageButton,
    });
    this.image = page.getByTestId(settingsXImage);
  }
}

class KeyboardShortcutsPane extends PaneSection {
  readonly rows: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'keyboard-shortcuts', {
      rowLabel: settingsKeyboardShortcutsRow,
      backLabel: settingsKeyboardShortcutsBackButton,
    });
    this.rows = page.getByTestId(settingsShortcutRow);
  }
}

class DeleteSection extends InlineSection {
  readonly button: Locator;
  readonly dialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly error: Locator;

  constructor(page: Page, sidebar: PostSettingsSidebar) {
    super(page, sidebar, 'delete');
    this.button = page.getByTestId(settingsDeleteButton);
    this.dialog = page.getByTestId(settingsDeleteDialog);
    this.confirmButton = this.dialog.getByRole('button', {
      name: settingsDeleteConfirmButton,
      exact: true,
    });
    this.cancelButton = this.dialog.getByRole('button', {
      name: settingsDeleteCancelButton,
      exact: true,
    });
    this.error = page.getByTestId(settingsDeleteError);
  }

  protected anchor(): Locator {
    return this.button;
  }

  /** Confirms the deletion; the editor then leaves for the list. */
  async deletePost(): Promise<void> {
    await this.button.click();
    await this.confirmButton.click();
  }
}

/** The React editor's post settings sidebar. */
export class PostSettingsSidebar {
  readonly root: Locator;
  /** A section's failed-browse notice, wherever the sidebar shows one. */
  readonly loadError: Locator;

  readonly url: UrlSection;
  readonly publishDate: PublishDateSection;
  readonly tags: TagsSection;
  readonly access: AccessSection;
  readonly excerpt: ExcerptSection;
  readonly authors: AuthorsSection;
  readonly template: TemplateSection;
  readonly showTitle: ShowTitleSection;
  readonly featured: FeaturedSection;
  readonly postHistory: PostHistorySection;
  readonly codeInjection: CodeInjectionPane;
  readonly metaData: MetaDataPane;
  readonly xCard: XCardPane;
  readonly facebookCard: SocialCardPane;
  readonly keyboardShortcuts: KeyboardShortcutsPane;
  readonly delete: DeleteSection;

  private readonly toggle: Locator;
  private readonly sections: Record<PostSettingsSectionId, SettingsSectionObject>;
  private readonly panes: PaneSection[];

  /** `toggle` is the header button that shows and hides the sidebar. */
  constructor(page: Page, toggle: Locator) {
    this.toggle = toggle;
    this.root = page.getByTestId(postSettingsSidebar);
    this.loadError = page.getByTestId(settingsLoadError);

    this.url = new UrlSection(page, this);
    this.publishDate = new PublishDateSection(page, this);
    this.tags = new TagsSection(page, this);
    this.access = new AccessSection(page, this);
    this.excerpt = new ExcerptSection(page, this);
    this.authors = new AuthorsSection(page, this);
    this.template = new TemplateSection(page, this);
    this.showTitle = new ShowTitleSection(page, this);
    this.featured = new FeaturedSection(page, this);
    this.postHistory = new PostHistorySection(page, this);
    this.codeInjection = new CodeInjectionPane(page, this);
    this.metaData = new MetaDataPane(page, this);
    this.xCard = new XCardPane(page, this);
    this.facebookCard = new SocialCardPane(page, this, {
      id: 'facebook-card',
      rowLabel: settingsFacebookCardRow,
      backLabel: settingsFacebookCardBackButton,
      titleInput: settingsFacebookTitleInput,
      descriptionInput: settingsFacebookDescriptionInput,
      preview: settingsFacebookPreview,
      previewImage: settingsFacebookPreviewImage,
      addImageLabel: addFacebookImageLabel,
      unsplashButton: facebookImageUnsplashButton,
      removeImageButton: removeFacebookImageButton,
    });
    this.keyboardShortcuts = new KeyboardShortcutsPane(page, this);
    this.delete = new DeleteSection(page, this);

    this.sections = {
      url: this.url,
      'publish-date': this.publishDate,
      tags: this.tags,
      access: this.access,
      excerpt: this.excerpt,
      authors: this.authors,
      template: this.template,
      'show-title-and-feature-image': this.showTitle,
      featured: this.featured,
      'post-history': this.postHistory,
      'code-injection': this.codeInjection,
      'meta-data': this.metaData,
      'x-card': this.xCard,
      'facebook-card': this.facebookCard,
      'keyboard-shortcuts': this.keyboardShortcuts,
      delete: this.delete,
    };
    this.panes = [
      this.codeInjection,
      this.metaData,
      this.xCard,
      this.facebookCard,
      this.keyboardShortcuts,
    ];
  }

  async open(): Promise<void> {
    if (!(await this.root.isVisible())) {
      await this.toggle.click();
    }
    await this.root.waitFor({ state: 'visible' });
  }

  async close(): Promise<void> {
    if (await this.root.isVisible()) {
      await this.toggle.click();
    }
    await this.root.waitFor({ state: 'hidden' });
  }

  /** Opens the sidebar and backs out of any open pane, which hides the list. */
  async showSectionList(): Promise<void> {
    await this.open();
    for (const pane of this.panes) {
      if (await pane.isOpen()) {
        await pane.close();
        return;
      }
    }
  }

  /**
   * Opens the sidebar and then the section: its pane or dialog, or its place
   * in the list. Fails fast when the list leaves the section out.
   */
  async openSection(id: PostSettingsSectionId): Promise<void> {
    await this.sections[id].open();
  }

  /** Closes a section's pane or dialog, failing fast when it is not open; an inline section has nothing to close. */
  async closeSection(id: PostSettingsSectionId): Promise<void> {
    await this.sections[id].close();
  }
}
