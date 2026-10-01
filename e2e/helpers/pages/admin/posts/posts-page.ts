import { AdminPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';
import {
  listPage,
  managePostView,
  postsFilters,
  postsList,
  postsListItem,
} from '@tryghost/test-data/selectors/posts';

export class PostsPage extends AdminPage {
  public readonly postsList: Locator;
  public readonly postsListItem: Locator;
  public readonly newPostButton: Locator;

  public readonly postsFilters: Locator;
  public readonly addFilterButton: Locator;

  public readonly saveViewButton: Locator;
  public readonly editViewButton: Locator;

  public readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/posts';

    this.postsList = page.getByTestId(postsList);
    this.postsListItem = this.postsList.getByTestId(postsListItem);
    this.newPostButton = page.getByRole('link', { name: 'New post', exact: true });

    this.postsFilters = page.getByTestId(postsFilters);
    // "Filter" until a chip exists, then "Add filter" (icon-only under Admin 7).
    this.addFilterButton = this.postsFilters.getByRole('button', { name: /^(add )?filter$/i });

    // One trigger, labelled by whether the current filters match a saved view.
    // The popover's submit is also named "Save view", so match the trigger by testid.
    const manageViewTrigger = page.getByTestId(managePostView);
    this.saveViewButton = manageViewTrigger.filter({ hasText: 'Save view' });
    this.editViewButton = manageViewTrigger.filter({ hasText: 'Edit view' });

    this.pageTitle = page.getByTestId(listPage('posts')).getByRole('heading', { level: 1 });
  }

  getPostByTitle(title: string): Locator {
    return this.postsListItem.filter({
      has: this.page.getByRole('heading', { name: title, exact: true, level: 3 }),
    });
  }

  async getScrollParentScrollTop(): Promise<number> {
    return this.postsList.evaluate((list) => {
      let element = list instanceof HTMLElement ? list : list.parentElement;
      while (element) {
        const overflow = window.getComputedStyle(element).overflowY;
        if (
          overflow !== 'visible' &&
          overflow !== 'hidden' &&
          element.scrollHeight >= element.clientHeight
        ) {
          return element.scrollTop;
        }
        element = element.parentElement;
      }
      return document.body.scrollTop;
    });
  }

  async waitForPageToFullyLoad() {
    await this.page.waitForURL(this.pageUrl);
    // The screen heading, not the list: with no posts the screen renders an
    // empty state instead of the list.
    await this.pageTitle.waitFor({ state: 'visible' });
  }

  /**
   * Waits for the list without asserting the URL. `waitForPageToFullyLoad`
   * matches the bare `/ghost/#/posts`, so it never settles on a filtered or
   * saved-view URL — which is exactly where the query params matter.
   */
  async waitForList() {
    await this.postsList.waitFor({ state: 'visible' });
  }

  async refreshData() {
    await this.page.reload();
  }

  /**
   * Picks the field in the add-filter popover, then its value. A field that
   * already has a chip is no longer offered — change it through the chip.
   */
  private async applyFilter(fieldLabel: string, optionName: string): Promise<void> {
    await this.addFilterButton.click();
    await this.page.getByRole('option', { name: fieldLabel, exact: true }).click();
    await this.page.getByRole('option', { name: optionName, exact: true }).click();
  }

  async selectType(typeName: string): Promise<void> {
    await this.applyFilter('Post type', typeName);
  }

  async selectVisibility(visibilityName: string): Promise<void> {
    await this.applyFilter('Access', visibilityName);
  }

  async selectAuthor(authorName: string): Promise<void> {
    await this.applyFilter('Author', authorName);
  }

  async selectTag(tagName: string): Promise<void> {
    await this.applyFilter('Tag', tagName);
  }

  async openSaveViewModal(): Promise<void> {
    await this.saveViewButton.click();
  }

  async openEditViewModal(): Promise<void> {
    await this.editViewButton.click();
  }

  /** The row's status detail ("to be published at …") is mounted only while it is hovered. */
  async hoverPost(title: string): Promise<void> {
    await this.getPostByTitle(title).hover();
  }

  /**
   * How many rows are selected. Read as an attribute: `data-selected` is the
   * only marker for a selected row — there is no role or label for it.
   */
  async selectedPostCount(): Promise<number> {
    const rows = await this.postsListItem.all();
    const flags = await Promise.all(rows.map((row) => row.getAttribute('data-selected')));

    return flags.filter((flag) => flag === 'true').length;
  }

  /**
   * Modifier-click, which is how the list selects without checkboxes.
   *
   * Dispatched rather than clicked for real: the row is a link, and a genuine
   * cmd-click on a link opens a new browser tab — which tears the test context
   * down mid-run. The row listens for `mousedown` in the capture phase, so this
   * drives the same code path the user does.
   */
  async selectPost(title: string): Promise<void> {
    await this.getPostByTitle(title).evaluate((row) => {
      row.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          metaKey: true,
        }),
      );
    });
  }

  async openContextMenuFor(title: string): Promise<void> {
    await this.getPostByTitle(title).click({ button: 'right' });
    // The one item the menu offers unconditionally.
    await this.contextMenuItem('Add a tag').waitFor({ state: 'visible' });
  }

  contextMenuItem(label: string): Locator {
    return this.page.getByRole('menuitem', { name: label, exact: true });
  }

  /** Confirms a bulk-action modal by its verb. */
  async confirmAction(label: string): Promise<void> {
    await this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: label, exact: true })
      .click();
  }

  async confirmDelete(): Promise<void> {
    await this.confirmAction('Delete');
  }
}
