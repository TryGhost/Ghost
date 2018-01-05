import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import InfinityRoute from 'ember-infinity/mixins/route';
import RSVP from 'rsvp';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, InfinityRoute, {
    titleToken: 'Team',

    classNames: ['view-team'],

    modelPath: 'controller.activeUsers',
    perPage: 15,
    perPageParam: 'limit',
    totalPagesParam: 'meta.pagination.pages',

    model() {
        return this.get('session.user').then((user) => {
            let modelPath = this.get('modelPath');
            let perPage = this.get('perPage');

            let modelPromises = {
                activeUsers: this.infinityModel('user', {
                    modelPath,
                    perPage,
                    filter: 'status:-inactive',
                    startingPage: 1
                })
            };

            // authors do not have permission to hit the invites or suspended users endpoint
            if (!user.get('isAuthor')) {
                modelPromises.invites = this.store.query('invite', {limit: 'all'})
                    .then(() => this.store.filter('invite', invite => !invite.get('isNew')));

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
