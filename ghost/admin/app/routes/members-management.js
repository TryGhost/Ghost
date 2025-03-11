import AuthenticatedRoute from './authenticated';
//import {inject as service} from '@ember/service';

/* The commented out code would redirect staff to the home if the site has membership disabled. */
/* As it is currently possible to disable membership but still have members in the database, this needs more thought. */

export default class MembersManagementRoute extends AuthenticatedRoute {
    //@service settings;

    beforeModel() {
        super.beforeModel(...arguments);
        console.log(this.settings)
        /* if (this.settings.get('membersEnabled') === false) {
            return this.transitionTo('home');
        } */
        if (!this.session.user || !this.session.user.canManageMembers) {
            return this.transitionTo('home');
        }
    }
}