import * as postAnalyticsSel from '@tryghost/test-data/selectors/post-analytics';
import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class PostAnalyticsGrowthPage extends AdminPage {
    readonly membersCard: Locator;
    readonly viewMemberButton: Locator;
    readonly topSourcesCard: Locator;

    constructor(page: Page) {
        super(page);

        this.membersCard = this.page.getByTestId(postAnalyticsSel.membersCard);
        this.viewMemberButton = this.membersCard.getByRole('button', {name: 'View member'});

        this.topSourcesCard = this.page.getByTestId(postAnalyticsSel.topSourcesCard);
    }
}
