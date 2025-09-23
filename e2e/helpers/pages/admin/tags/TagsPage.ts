import {Locator, Page, Request} from '@playwright/test';
import {AdminPage} from '../AdminPage';

// XXX: Remove these types and the mockTagsResponse method once we have proper
// test isolation and no longer need to mock responses.
interface Tag {
    id: string;
    name: string;
    slug: string;
    url: string;
    description: string;
}

interface PaginatedResponse {
    meta: {
        pagination: {
            page: number;
            limit: number;
            pages: number;
            total: number;
            next?: number;
        };
    };
    tags: Tag[];
}

export class TagsPage extends AdminPage {
    readonly pageContent: Locator;
    readonly tagList: Locator;
    readonly tagListRow: Locator;

    readonly tabs: Locator;
    readonly activeTab: Locator;
    readonly newTagButton: Locator;

    readonly emptyStateTitle: Locator;
    readonly emptyStateAction: Locator;

    readonly loadingPlaceholder: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';
        this.pageContent = page.getByTestId('tags-page');
        this.tagList = page.getByTestId('tags-list');
        this.tagListRow = this.tagList.getByTestId('tag-list-row');

        this.tabs = page.getByTestId('tags-header-tabs');
        this.activeTab = this.tabs.locator('[data-state="active"]');
        this.newTagButton = page.getByRole('link', {name: 'New tag'});

        this.emptyStateTitle = this.pageContent.getByRole('heading', {name: 'Start organizing your content'});
        this.emptyStateAction = this.pageContent.getByRole('link', {name: 'Create a new tag'});

        this.loadingPlaceholder = page.getByTestId('loading-placeholder');
    }

    async selectTab(tabText: string) {
        const tab = this.tabs.getByRole('link', {name: tabText});
        await tab.click();
    }

    getRowByTitle(title: string) {
        return this.tagListRow.filter({has: this.page.getByRole('link', {name: title, exact: true})});
    }

    // XXX: Remove once we have proper test isolation and don't need mocking
    async mockTagsResponse(handler: (request: Request) => Promise<Partial<PaginatedResponse>>) {
        await this.page.route('/ghost/api/admin/tags/*', async (route, request) => {
            const tags = await handler(request);
            await route.fulfill({
                body: JSON.stringify({
                    meta: {
                        ...tags.meta,
                        pagination: {
                            page: 1,
                            limit: 100,
                            pages: 1,
                            total: tags.meta?.pagination?.total ?? tags.tags?.length ?? 0,
                            ...tags.meta?.pagination
                        }
                    },
                    tags: tags.tags ?? []
                })
            });
        });
    }
}
