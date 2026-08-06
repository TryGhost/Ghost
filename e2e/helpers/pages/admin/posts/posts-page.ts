import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';
import {postsFilters, postsList, postsListItem} from '@tryghost/test-data/selectors/posts';

/** Which implementation serves the list — decided by the `postsListReact` flag. */
export type PostsListImplementation = 'ember' | 'react';

export class PostsPage extends AdminPage {
    private readonly implementation: PostsListImplementation;

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

    public readonly emptyState: Locator;

    constructor(page: Page, {implementation = 'ember'}: {implementation?: PostsListImplementation} = {}) {
        super(page);
        this.implementation = implementation;
        this.pageUrl = '/ghost/#/posts';

        this.postsList = page.getByTestId(postsList);
        this.postsListItem = this.postsList.getByTestId(postsListItem);
        this.newPostButton = page.getByRole('link', {name: 'New post', exact: true});

        this.postsFilters = page.getByTestId(postsFilters);
        // React's single entry point into the filter popover; absent in Ember,
        // which has a dropdown per field.
        this.addFilterButton = this.postsFilters.getByRole('button', {name: 'Filter', exact: true});
        this.typeFilter = this.postsFilters.getByRole('button', {name: 'Type filter'});
        this.visibilityFilter = this.postsFilters.getByRole('button', {name: 'Visibility filter'});
        this.authorFilter = this.postsFilters.getByRole('button', {name: 'Author filter'});
        this.tagFilter = this.postsFilters.getByRole('button', {name: 'Tag filter'});
        this.orderFilter = this.postsFilters.getByRole('button', {name: 'Sort filter'});

        // Ember titles these "Save as view..." / "Edit current view..."; React
        // labels them "Save view" / "Edit view", matching the members list. The
        // optional middle word covers both without two page objects.
        this.saveViewButton = page.getByRole('button', {name: /save (as )?view/i});
        this.editViewButton = page.getByRole('button', {name: /edit (current )?view/i});

        this.pageTitle = page.getByRole('heading', {level: 2});

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
     * Applies a filter. The gesture differs by implementation — Ember renders a
     * dropdown per field, React one "Filter" button that asks for the field
     * first — so the branch lives here, keyed by the constructor's
     * `implementation`, and no test body needs to know which screen it drives.
     * Never inferred from the DOM: a visibility probe races re-renders.
     */
    private async applyFilter(fieldLabel: string, emberTrigger: Locator, optionName: string): Promise<void> {
        if (this.implementation === 'ember') {
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
        await this.applyFilter('Author', this.authorFilter, authorName);
    }

    async selectTag(tagName: string): Promise<void> {
        await this.applyFilter('Tag', this.tagFilter, tagName);
    }

    async selectOrder(orderName: string): Promise<void> {
        if (this.implementation !== 'ember') {
            // React's sort is a menu next to the filter button, with its own
            // labels — drive it via a dedicated helper when a React-lane test
            // first needs it.
            throw new Error('selectOrder drives the Ember sort dropdown; the React list sorts via its sort menu');
        }

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
        const flags = await Promise.all(rows.map(row => row.evaluate((el) => {
            // Presence, not a `"true"` value. React writes
            // `data-selected="true"`; Ember writes the attribute with an *empty*
            // value, because Glimmer renders `data-selected={{true}}` as a bare
            // attribute and omits it entirely when false. Matching on `"true"`
            // made Ember's selection invisible to this helper, which is what
            // kept these tests out of the shared suite.
            const marker = el.closest('[data-selected]');

            return marker !== null && marker.getAttribute('data-selected') !== 'false';
        })));

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
            // Ember's handler sits on the wrapper carrying `role="menuitem"`;
            // React's on the row. Either way a capture-phase listener sees an
            // event dispatched at the row, so aim there and let it travel.
            const target = row;

            target.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                metaKey: true
            }));
        });
    }

    async openContextMenuFor(title: string): Promise<void> {
        await this.getPostByTitle(title).click({button: 'right'});
        // Waits on "Add a tag" rather than a container: the two menus share no
        // container, and it is the one item both offer unconditionally.
        await this.contextMenuItem('Add a tag').waitFor({state: 'visible'});
    }

    /**
     * An item in the right-click menu.
     *
     * The two implementations build the menu from different elements: React
     * uses Radix, so items carry `role="menuitem"`, while Ember renders a plain
     * list of `<button>`s with no menu roles at all.
     *
     * Matched on a trailing label rather than an exact one, because Ember's
     * accessible names have junk in front of them. The inlined SVG's title joins
     * the name ("Add a tag" is really `tagAdd a tag`), and where the icon also
     * carries an inline `<style>`, its CSS text joins too — Delete's accessible
     * name is `trash.trash_svg__a{fill:none;…}Delete`. An exact match finds
     * neither.
     */
    contextMenuItem(label: string): Locator {
        return this.page
            .getByRole('menuitem', {name: label, exact: true})
            .or(this.page.getByRole('button', {name: new RegExp(`${label}$`)}));
    }

    /**
     * Confirms a bulk-action modal by its verb. Ember renders its own modal
     * markup and React uses a Radix alertdialog, so the container differs —
     * but both put the same word on the button, which is what the test cares
     * about.
     */
    async confirmAction(label: string): Promise<void> {
        await this.page.getByRole('button', {name: label, exact: true}).last().click();
    }

    async confirmDelete(): Promise<void> {
        await this.confirmAction('Delete');
    }

    async getActiveViewName(): Promise<string | null> {
        return await this.pageTitle.textContent();
    }
}
