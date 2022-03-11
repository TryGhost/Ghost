import AdminRoute from 'ghost-admin/routes/admin';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ViewThemeRoute extends AdminRoute {
    @service modals;

    themeModal = null;

    model(params, transition) {
        const changeThemeController = this.controllerFor('settings.design.change-theme');
        const knownThemes = changeThemeController.officialThemes;

        const foundTheme = knownThemes.find(theme => theme.name === params.theme_name);

        if (foundTheme) {
            return foundTheme;
        }

        const path = transition.intent.url.replace(/^\//, '');
        return this.replaceWith('error404', {path, status: 404});
    }

    setupController(controller, model) {
        this.themeModal?.close();

        this.themeModal = this.modals.open('modals/design/view-theme', {
            theme: model
        }, {
            beforeClose: this.beforeModalClose
        });
    }

    deactivate() {
        this.isLeaving = true;
        this.themeModal?.close();

        this.isLeaving = false;
        this.themeModal = null;
    }

    @action
    beforeModalClose() {
        if (this.themeModal && !this.isLeaving) {
            this.router.transitionTo('settings.design.change-theme');
        }
    }
}
