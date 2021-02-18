import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    config: service(),
    settings: service(),

    // reload settings to ensure we have latest values and pre-configure
    // Unsplash to be active if the server doesn't have any unsplash setting
    beforeModel() {
        this._super(...arguments);
        let {settings} = this;

        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor())
            .then(this.settings.reload())
            .then(() => {
                if (settings.get('unsplash')) {
                    return;
                }

                // server doesn't have any unsplash settings by default but it can provide
                // overrides via config:
                // - unsplash: use as default but allow settings override
                let unsplash = true;

                settings.set('unsplash', unsplash);
            });
    },

    actions: {
        save() {
            this.controller.send('save');
        },

        willTransition(transition) {
            let controller = this.controller;
            let modelIsDirty = controller.dirtyAttributes;

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Unsplash'
        };
    }
});
