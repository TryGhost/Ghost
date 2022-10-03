import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class AuthenticatedRoute extends Route {
    @service session;
    @service notifications;

    async beforeModel(transition) {
        await this.checkForActiveSession();
        this.session.requireAuthentication(transition, 'signin');
    }

    /**
     * Always try to re-setup session & retry the original transition
     * if user data is still available in session store although the
     * session unauthenticated.
     *
     * If success, it will retry the original transition.
     * If failed, it will be handled by the redirect to sign in.
     */
    async checkForActiveSession() {
        if (!this.session.isAuthenticated) {
            if (this.session.user) {
                await this.session.setup();
                this.session.forceTransition = true;
                this.notifications.clearAll();
            }
        }
    }
}
