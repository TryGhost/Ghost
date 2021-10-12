import Component from '@glimmer/component';
import {TrackedSet} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class DesignMenuComponent extends Component {
    @service config;
    @service customThemeSettings;
    @service router;
    @service settings;
    @service themeManagement;

    @tracked openSections = new TrackedSet();

    KNOWN_GROUPS = ['homepage', 'post'];

    constructor() {
        super(...arguments);
        this.fetchThemeSettingsTask.perform();
        this.themeManagement.updatePreviewHtmlTask.perform();
    }

    get themeSettings() {
        return this.customThemeSettings.settings;
    }

    get siteWideSettings() {
        return this.customThemeSettings.settings.filter(setting => !this.KNOWN_GROUPS.includes(setting.group));
    }

    get homepageSettings() {
        return this.customThemeSettings.settings.filter(setting => setting.group === 'homepage');
    }

    get postPageSettings() {
        return this.customThemeSettings.settings.filter(setting => setting.group === 'post');
    }

    @action
    toggleSection(section) {
        this.openSections.has(section) ? this.openSections.delete(section) : this.openSections.add(section);
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
