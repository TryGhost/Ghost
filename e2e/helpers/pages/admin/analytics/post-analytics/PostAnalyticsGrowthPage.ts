import {AdminPage} from '../../AdminPage';
import {Locator, Page} from '@playwright/test';

export class PostAnalyticsGrowthPage extends AdminPage {
    readonly membersCard: Locator;
    readonly viewMemberButton: Locator;
    readonly topSourcesCard: Locator;

    constructor(page: Page) {
        super(page);

        this.membersCard = this.page.getByTestId('members-card');
        this.viewMemberButton = this.membersCard.getByRole('button', {name: 'View member'});

        this.topSourcesCard = this.page.getByTestId('top-sources-card');
    }
}
