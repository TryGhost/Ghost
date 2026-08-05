import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class PostsPage extends AdminPage {
    public readonly postsList: Locator;
    public readonly postsListItem: Locator;
    public readonly newPostButton: Locator;

    public readonly postsFilters: Locator;
    public readonly addFilterButton: Locator;

    public readonly typeFilter: Locator;
    public readonly visibilityFilter: Locator;
    public readonly authorFilter: Locator;
    public readonly tagFilter: Locator;
    public readonly orderFilter: Locator;

    public readonly saveViewButton: Locator;
    public readonly editViewButton: Locator;

    public readonly pageTitle: Locator;

    public readonly contextMenu: Locator;
    public readonly emptyState: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts';

        this.postsList = page.getByTestId('posts-list');
        this.postsListItem = this.postsList.getByTestId('posts-list-item');
        this.newPostButton = page.getByRole('link', {name: 'New post', exact: true});

        this.postsFilters = page.getByTestId('posts-filters');
        // React's single entry point into the filter popover; absent in Ember,
        // which has a dropdown per field.
        this.addFilterButton = this.postsFilters.getByRole('button', {name: 'Filter', exact: true});
        this.typeFilter = this.postsFilters.getByRole('button', {name: 'Type filter'});
        this.visibilityFilter = this.postsFilters.getByRole('button', {name: 'Visibility filter'});
        this.authorFilter = this.postsFilters.getByRole('button', {name: 'Author filter'});
        this.tagFilter = this.postsFilters.getByRole('button', {name: 'Tag filter'});
        this.orderFilter = this.postsFilters.getByRole('button', {name: 'Sort filter'});

        this.saveViewButton = page.getByRole('button', {name: /save as view/i});
        this.editViewButton = page.getByRole('button', {name: /edit current view/i});

        this.pageTitle = page.getByRole('heading', {level: 2});

        this.contextMenu = page.getByRole('menu');
        this.emptyState = page.getByText(/No posts match the current filter/i);
    }

    getPostByTitle(title: string): Locator {
        return this.postsListItem.filter({has: this.page.getByRole('heading', {name: title, exact: true, level: 3})});
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.postsList.waitFor({state: 'visible'});
    }

    /**
     * Waits for the list without asserting the URL. `waitForPageToFullyLoad`
     * matches the bare `/ghost/#/posts`, so it never settles on a filtered or
     * saved-view URL — which is exactly where the query params matter.
     */
    async waitForList() {
        await this.postsList.waitFor({state: 'visible'});
    }

    async refreshData() {
        await this.page.reload();
    }

    /**
     * Applies a filter.
     *
     * The two implementations reach the same result through different UI:
     * Ember has one dropdown per field, React has a single "Filter" button that
     * asks which field first. The *gesture* differs, the contract does not — so
     * the branch lives here and no test body needs to know which screen it is
     * driving.
     */
    private async applyFilter(fieldLabel: string, emberTrigger: Locator, optionName: string): Promise<void> {
        if (await emberTrigger.isVisible()) {
            await emberTrigger.click();
        } else {
            await this.addFilterButton.click();
            await this.page.getByRole('option', {name: fieldLabel, exact: true}).click();
        }

        await this.page.getByRole('option', {name: optionName, exact: true}).click();
    }

    async selectType(typeName: string): Promise<void> {
        await this.applyFilter('Post type', this.typeFilter, typeName);
    }

    async selectVisibility(visibilityName: string): Promise<void> {
        await this.applyFilter('Access', this.visibilityFilter, visibilityName);
    }

    async selectAuthor(authorName: string): Promise<void> {
        await this.authorFilter.click();
        await this.page.getByRole('option', {name: authorName, exact: true}).click();
    }

    async selectTag(tagName: string): Promise<void> {
        await this.tagFilter.click();
        await this.page.getByRole('option', {name: tagName, exact: true}).click();
    }

    async selectOrder(orderName: string): Promise<void> {
        await this.orderFilter.click();
        await this.page.getByRole('option', {name: orderName, exact: true}).click();
    }

    async openSaveViewModal(): Promise<void> {
        await this.saveViewButton.waitFor({state: 'visible'});
        await this.saveViewButton.click();
    }

    async openEditViewModal(): Promise<void> {
        await this.editViewButton.waitFor({state: 'visible'});
        await this.editViewButton.click();
    }

    /**
     * How many rows are selected.
     *
     * Read as an attribute rather than located by one: the repo forbids CSS
     * selectors in e2e, and `data-selected` is the only marker either
     * implementation exposes — there is no role or label for "selected row".
     */
    async selectedPostCount(): Promise<number> {
        const rows = await this.postsListItem.all();
        // `closest` because the two implementations mark the row at different
        // depths: React sets `data-selected` on the row itself, Ember on the
        // wrapper around it. This is a DOM call inside the page, not a
        // Playwright CSS locator.
        const flags = await Promise.all(
            rows.map(row => row.evaluate(el => el.closest('[data-selected="true"]') !== null))
        );

        return flags.filter(Boolean).length;
    }

    /**
     * Modifier-click, which is how both implementations select without
     * checkboxes.
     *
     * Dispatched rather than clicked for real: the whole row is a link in both
     * screens, and a genuine cmd-click on a link opens a new browser tab —
     * which tears the test context down mid-run. Both implementations listen
     * for `mousedown` (in the capture phase, precisely so they can beat the
     * link), so this drives the same code path the user does.
     */
    async selectPost(title: string): Promise<void> {
        await this.getPostByTitle(title).evaluate((row) => {
            // Ember listens on the wrapper that carries `data-selected`; React
            // listens on the row itself. Aim at whichever is present so one
            // helper drives both.
            const target = row.closest('[data-selected]') ?? row;

            target.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                metaKey: true
            }));
        });
    }

    async openContextMenuFor(title: string): Promise<void> {
        await this.getPostByTitle(title).click({button: 'right'});
        await this.contextMenu.waitFor({state: 'visible'});
    }

    contextMenuItem(label: string): Locator {
        return this.contextMenu.getByRole('menuitem', {name: label, exact: true});
    }

    /**
     * Confirms a destructive bulk action. Ember renders its own modal markup
     * and React uses a Radix alertdialog, so the container differs — but both
     * put the same word on the button, which is what the test cares about.
     */
    async confirmDelete(): Promise<void> {
        await this.page.getByRole('button', {name: 'Delete', exact: true}).last().click();
    }

    async getActiveViewName(): Promise<string | null> {
        return await this.pageTitle.textContent();
    }
}
