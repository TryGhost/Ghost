import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class MembersActivityPage extends AdminPage {
    readonly title: Locator;
    readonly breadcrumb: Locator;
    readonly backToAllActivityLink: Locator;
    readonly eventsTable: Locator;
    readonly eventRows: Locator;
    readonly filterEventsButton: Locator;
    readonly noEventsMessage: Locator;
    readonly noMatchingEventsMessage: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members-activity';

        this.title = page.getByTestId('members-activity-title');
        this.breadcrumb = page.getByTestId('members-activity-breadcrumb');
        this.backToAllActivityLink = page.getByTestId('members-activity-back');
        this.eventsTable = page.getByTestId('members-activity-table');
        this.eventRows = this.eventsTable.getByRole('row').filter({hasNot: page.getByRole('columnheader')});
        this.filterEventsButton = page.getByTestId('filter-events-button');
        this.noEventsMessage = page.getByText('No member activity yet');
        this.noMatchingEventsMessage = page.getByText('No activities match the current filter');
    }

    async gotoForMember(memberId: string): Promise<void> {
        await this.goto(`${this.pageUrl}?member=${memberId}`);
    }

    getEventRowsByMemberName(name: string): Locator {
        return this.eventRows.filter({hasText: name});
    }

    async openEventTypeFilter(): Promise<void> {
        await this.filterEventsButton.click();
    }

    getEventTypeToggle(eventType: string): Locator {
        return this.page.getByTestId(`event-type-filter-toggle-${eventType}`);
    }

    async toggleEventType(eventType: string): Promise<void> {
        await this.getEventTypeToggle(eventType).click();
    }
}
