import {AdminPage} from '@/admin-pages';
import {JSHandle, Locator, Page} from '@playwright/test';

export class MembersPage extends AdminPage {
    readonly newMemberButton: Locator;
    public readonly loadMoreButton: Locator;
    public readonly membersListScrollRoot: Locator;
    readonly memberListItems: Locator;

    constructor(page: Page, {route = 'members'}: {route?: string} = {}) {
        super(page);
        this.pageUrl = `/ghost/#/${route}`;

        this.newMemberButton = page.getByRole('link', {name: 'New member'});

        this.loadMoreButton = page.getByRole('button', {name: 'Load more'});
        this.membersListScrollRoot = page.getByTestId('members-list-scroll-root');
        this.memberListItems = page.getByTestId('members-list-item');
    }

    async clickMemberByEmail(email: string): Promise<void> {
        await this.memberListItems.filter({hasText: email}).click();
    }

    async getMaxRenderedIndex(): Promise<number> {
        return await this.memberListItems.evaluateAll((rows) => {
            return rows.reduce((maxIndex, row) => {
                return Math.max(maxIndex, Number(row.getAttribute('data-index') || '-1'));
            }, -1);
        });
    }

    private async getMembersScrollParentHandle(): Promise<JSHandle<HTMLElement>> {
        return await this.membersListScrollRoot.evaluateHandle((element) => {
            let node: Node | null = element;

            while (node) {
                if (node instanceof HTMLElement) {
                    const overflowY = window.getComputedStyle(node).overflowY;
                    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

                    if (isScrollable && node.scrollHeight >= node.clientHeight) {
                        return node;
                    }
                }

                node = node.parentNode;
            }

            return document.body;
        }) as JSHandle<HTMLElement>;
    }

    async getScrollParentScrollTop(): Promise<number> {
        const scrollParent = await this.getMembersScrollParentHandle();

        try {
            return await scrollParent.evaluate(element => element.scrollTop);
        } finally {
            await scrollParent.dispose();
        }
    }

    async scrollScrollParentBy(deltaY: number): Promise<void> {
        const scrollParent = await this.getMembersScrollParentHandle();

        try {
            await scrollParent.evaluate((element, pixels) => {
                element.scrollBy(0, pixels);
            }, deltaY);
        } finally {
            await scrollParent.dispose();
        }
    }

    async scrollUntilMaxRenderedIndexAtLeast(targetIndex: number): Promise<number> {
        let maxRenderedIndex = await this.getMaxRenderedIndex();

        for (let i = 0; i < 30 && maxRenderedIndex < targetIndex; i += 1) {
            await this.scrollScrollParentBy(4000);
            await this.page.waitForFunction((previousMaxIndex) => {
                const rows = Array.from(document.querySelectorAll('[data-testid="members-list-item"]'));

                return rows.some(row => Number(row.getAttribute('data-index') || '-1') > previousMaxIndex);
            }, maxRenderedIndex);
            maxRenderedIndex = await this.getMaxRenderedIndex();
        }

        return maxRenderedIndex;
    }

    getMemberByName(name: string): Locator {
        return this.memberListItems.filter({hasText: name});
    }
}
