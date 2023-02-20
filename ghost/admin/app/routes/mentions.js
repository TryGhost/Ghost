import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MentionsRoute extends AuthenticatedRoute {
    @service store;
    @service feature;
    @service infinity;

    perPage = 10;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.feature.webmentions) {
            return this.transitionTo('dashboard');
        }
    }

    model() {
        const perPage = this.perPage;
        const paginationParams = {
            perPageParam: 'limit',
            totalPagesParam: 'meta.pagination.pages',
            countParam: 'meta.pagination.total'
        };

        const paginationSettings = {perPage, startingPage: 1, order: 'created_at desc', ...paginationParams};

        return this.infinity.model('mention', paginationSettings);
    }
}
