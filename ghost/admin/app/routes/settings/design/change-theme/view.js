import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class ViewThemeRoute extends Route {
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
        });
    }

    deactivate() {
        this.themeModal?.close();
    }
}
