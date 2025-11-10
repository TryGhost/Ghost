import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class MembersPage extends AdminPage {
    readonly newMemberButton: Locator;
    readonly memberListItems: Locator;
    readonly emptyStateHeading: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members';

        this.newMemberButton = page.getByRole('link', {name: 'New member'});
        this.memberListItems = page.getByTestId('members-list-item');
        this.emptyStateHeading = page.getByRole('heading', {name: 'Start building your audience'});
    }

    async clickMemberByEmail(email: string): Promise<void> {
        await this.memberListItems.filter({hasText: email}).click();
    }

    getMemberByName(name: string): Locator {
        return this.memberListItems.filter({hasText: name});
    }

    getMemberEmail(emailAddress: string): Locator {
        return this.memberListItems.filter({hasText: emailAddress}).getByRole('paragraph');
    }

    async getMemberCount(): Promise<number> {
        return await this.memberListItems.count();
    }
}
