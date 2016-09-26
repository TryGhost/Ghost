import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import PaginationMixin from 'ghost-admin/mixins/pagination';
import styleBody from 'ghost-admin/mixins/style-body';
import RSVP from 'rsvp';
import {isBlank} from 'ember-utils';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationMixin, {
    titleToken: 'Team',

    classNames: ['view-team'],

    paginationModel: 'user',
    paginationSettings: {
        status: 'all',
        limit: 20
    },

    model() {
        return this.get('session.user').then((user) => {
            let modelPromises = {
                users: this.loadFirstPage().then(() => {
                    return this.store.filter('user', (user) => {
                        return !user.get('isNew') && !isBlank(user.get('status'));
                    });
                })
            };

            // authors do not have permission to hit the invites endpoint
            if (!user.get('isAuthor')) {
                modelPromises.invites = this.store.query('invite', {limit: 'all'}).then(() => {
                    return this.store.filter('invite', (invite) => {
                        return !invite.get('isNew');
                    });
                });
            }

            return RSVP.hash(modelPromises);
        });
    },

    setupController(controller, models) {
        controller.setProperties(models);
    },

    actions: {
        reload() {
            this.refresh();
        }
    }
});
