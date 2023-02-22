import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import RSVP from 'rsvp';
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

    model(params) {
        const perPage = this.perPage;
        const paginationParams = {
            perPageParam: 'limit',
            totalPagesParam: 'meta.pagination.pages',
            countParam: 'meta.pagination.total'
        };

        const paginationSettings = {perPage, startingPage: 1, order: 'created_at desc', ...paginationParams};

        if (params.post_id) {
            paginationSettings.filter = `resource_id:${params.post_id}+resource_type:post`;
        }

        return RSVP.hash({
            mentions: this.infinity.model('mention', paginationSettings),
            post: params.post_id ? this.store.findRecord('post', params.post_id) : null
        });
    }
}
