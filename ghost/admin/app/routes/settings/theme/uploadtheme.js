import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class UploadthemeRouter extends AuthenticatedRoute {
    @service limit;

    limitErrorMessage = null

    async model() {
        // TODO: The "Upload a theme" button may welcome a spinner in case the limiter introduces
        // an actual async operation. Without a spinner the UI may seem unresponsive after a click.
        const [themes] = await Promise.all([
            this.store.findAll('theme'),
            // Sending a bad string to make sure it fails (empty string isn't valid)
            this.limit.limiter.errorIfWouldGoOverLimit('customThemes', {value: '.'})
                .then(() => {
                    this.limitErrorMessage = null;
                })
                .catch((error) => {
                    if (error.errorType === 'HostLimitError') {
                        this.limitErrorMessage = error.message;
                        return;
                    }

                    throw error;
                })
        ]);

        return themes;
    }

    setupController(controller, model) {
        controller.set('themes', model);
        controller.set('limitErrorMessage', this.limitErrorMessage);
    }

    actions = {
        cancel() {
            this.transitionTo('settings.theme');
        }
    }
}
