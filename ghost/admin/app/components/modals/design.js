import Component from '@glimmer/component';
import {TrackedSet} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalsDesignCustomizeComponent extends Component {
    @service customThemeSettings;
    @service settings;
    @service themeManagement;
    @service config;

    @tracked openSections = new TrackedSet();

    constructor() {
        super(...arguments);
        this.fetchThemeSettingsTask.perform();
        this.themeManagement.updatePreviewHtmlTask.perform();
    }

    get themeSettings() {
        return this.customThemeSettings.settings;
    }

    get siteWideSettings() {
        return this.customThemeSettings.settings.filter(setting => !setting.group);
    }

    get homepageSettings() {
        return this.customThemeSettings.settings.filter(setting => setting.group === 'home');
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
}
