import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../../AdminPage';

export class PostAnalyticsGrowthPage extends AdminPage {
    public readonly membersCard: Locator;
    public readonly viewMemberButton: Locator;
    public readonly topSourcesCard: Locator;

    constructor(page: Page) {
        super(page);

        this.membersCard = this.page.getByTestId('members-card');
        this.viewMemberButton = this.membersCard.getByRole('button', {name: 'View member'});

        this.topSourcesCard = this.page.getByTestId('top-sources-card');
    }
}
