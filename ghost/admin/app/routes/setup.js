import Route from '@ember/routing/route';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as injectService} from '@ember/service';

export default Route.extend(styleBody, {
    titleToken: 'Setup',

    classNames: ['ghost-setup'],

    ghostPaths: injectService(),
    session: injectService(),
    ajax: injectService(),
    config: injectService(),

    // use the beforeModel hook to check to see whether or not setup has been
    // previously completed.  If it has, stop the transition into the setup page.
    beforeModel() {
        this._super(...arguments);

        // with OAuth auth users are authenticated on step 2 so we
        // can't use the session.isAuthenticated shortcut
        if (!this.get('config.ghostOAuth') && this.get('session.isAuthenticated')) {
            this.transitionTo('posts');
            return;
        }

        let authUrl = this.get('ghostPaths.url').api('authentication', 'setup');

        // check the state of the setup process via the API
        return this.get('ajax').request(authUrl)
            .then((result) => {
                let [setup] = result.setup;

                if (setup.status) {
                    return this.transitionTo('signin');
                } else {
                    let controller = this.controllerFor('setup/two');
                    if (setup.title) {
                        controller.set('blogTitle', setup.title.replace(/&apos;/gim, '\''));
                    }

                    if (setup.name) {
                        controller.set('name', setup.name.replace(/&apos;/gim, '\''));
                    }

                    if (setup.email) {
                        controller.set('email', setup.email);
                    }
                }
            });
    },

    deactivate() {
        this._super(...arguments);
        this.controllerFor('setup/two').set('password', '');
    }
});
