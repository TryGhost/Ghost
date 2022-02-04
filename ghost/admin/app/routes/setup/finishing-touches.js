import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class SetupFinishingTouchesRoute extends Route {
    @service settings;
    @service themeManagement;

    model() {
        this.themeManagement.setPreviewType('homepage');
        this.themeManagement.updatePreviewHtmlTask.perform();
    }

    deactivate() {
        // rollback any unsaved setting changes when leaving
        this.settings.rollbackAttributes();
    }
}
