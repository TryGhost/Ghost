import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import InfinityModel from 'ember-infinity/lib/infinity-model';
import RSVP from 'rsvp';
import classic from 'ember-classic-decorator';
import {inject as service} from '@ember/service';

@classic
class LoadSourceMentions extends InfinityModel {
    @service mentionUtils;

    async afterInfinityModel(mentions) {
        return await this.mentionUtils.loadGroupedMentions(mentions);
    }
}

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
        let extension = undefined;

        if (params.post_id) {
            paginationSettings.filter = `resource_id:${params.post_id}+resource_type:post`;
        } else {
            // Only return mentions with the same source once
            paginationSettings.unique = true;
            extension = LoadSourceMentions;
        }

        return RSVP.hash({
            mentions: this.infinity.model('mention', paginationSettings, extension),
            post: params.post_id ? this.store.findRecord('post', params.post_id) : null
        });
    }
}
