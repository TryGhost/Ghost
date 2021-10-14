import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class DesignMenuComponent extends Component {
    @service config;
    @service customThemeSettings;
    @service router;
    @service settings;
    @service store;
    @service themeManagement;

    @tracked openSection = null;
    @tracked themes = this.store.peekAll('theme');

    constructor() {
        super(...arguments);
        this.fetchThemeSettingsTask.perform();
        this.themeManagement.updatePreviewHtmlTask.perform();

        // fetch all themes in the background so we can show the active theme
        this.store.findAll('theme');
    }

    get activeTheme() {
        return this.themes.findBy('active', true);
    }

    @action
    toggleSection(section) {
        if (this.openSection === section) {
            this.openSection = null;
        } else {
            this.openSection = section;

            const group = this.customThemeSettings.KNOWN_GROUPS.findBy('key', section);
            if (group && group.previewType) {
                this.themeManagement.setPreviewType(group.previewType);
            } else {
                this.themeManagement.setPreviewType('homepage');
            }
        }
    }

    @task
    *fetchThemeSettingsTask() {
        yield this.customThemeSettings.load();
    }

    @action
    transitionBackToIndex() {
        if (this.router.currentRouteName !== 'settings.design.index') {
            this.router.transitionTo('settings.design.index');
        }
    }
}
