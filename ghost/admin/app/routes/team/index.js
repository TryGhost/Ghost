import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import PaginationMixin from 'ghost-admin/mixins/pagination';
import RSVP from 'rsvp';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationMixin, {
    titleToken: 'Team',

    classNames: ['view-team'],

    paginationModel: 'user',
    paginationSettings: {
        filter: 'status:-inactive',
        limit: 20
    },

    model() {
        return this.get('session.user').then((user) => {
            let modelPromises = {
                activeUsers: this.loadFirstPage()
            };

            // authors do not have permission to hit the invites or suspended users endpoint
            if (!user.get('isAuthor')) {
                modelPromises.invites = this.store.query('invite', {limit: 'all'}).then(() => {
                    return this.store.filter('invite', (invite) => {
                        return !invite.get('isNew');
                    });
                });

                // fetch suspended users separately so that infinite scroll still works
                modelPromises.suspendedUsers = this.store.query('user', {limit: 'all', filter: 'status:inactive'});
            }

            // we need to load the roles into ember cache
            // invites return role_id only and we do not offer a /role/:id endpoint
            modelPromises.roles = this.get('store').query('role', {}).then((roles) => {
                return roles;
            });

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
