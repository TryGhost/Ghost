import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import RSVP from 'rsvp';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    infinity: service(),

    titleToken: 'Team',
    classNames: ['view-team'],

    modelPath: 'controller.activeUsers',
    perPage: 15,

    model() {
        return this.get('session.user').then((user) => {
            let modelPath = this.get('modelPath');
            let perPage = this.get('perPage');

            let modelPromises = {
                activeUsers: this.infinity.model('user', {
                    modelPath,
                    perPage,
                    filter: 'status:-inactive',
                    startingPage: 1,
                    perPageParam: 'limit',
                    totalPagesParam: 'meta.pagination.pages'
                })
            };

            // authors do not have permission to hit the invites or suspended users endpoint
            if (!user.get('isAuthorOrContributor')) {
                modelPromises.invites = this.store.query('invite', {limit: 'all'})
                    .then(() => this.store.peekAll('invite'));

                // fetch suspended users separately so that infinite scroll still works
                modelPromises.suspendedUsers = this.store.query('user', {limit: 'all', filter: 'status:inactive'});
            }

            // we need to load the roles into ember cache
            // invites return role_id only and we do not offer a /role/:id endpoint
            modelPromises.roles = this.get('store').query('role', {});

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
