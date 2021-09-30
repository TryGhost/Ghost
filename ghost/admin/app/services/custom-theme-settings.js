import Service from '@ember/service';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class CustomThemeSettingsServices extends Service {
    @service store;

    @tracked settings = [];

    get isDirty() {
        const dirtySetting = this.settings.find(setting => setting.hasDirtyAttributes);
        return !!dirtySetting;
    }

    get keyValueObject() {
        const keyValue = {};

        this.settings.forEach((setting) => {
            keyValue[setting.key] = setting.value;
        });

        return keyValue;
    }

    load() {
        return this.loadTask.perform();
    }

    @task
    *loadTask() {
        // unload stored settings and re-load from API so they always match active theme
        // run is required here, see https://github.com/emberjs/data/issues/5447#issuecomment-845672812
        run(() => this.store.unloadAll('custom-theme-setting'));

        const settings = yield this.store.findAll('custom-theme-setting');
        this.settings = settings;

        return this.settings;
    }

    save() {
        return this.saveTask.perform();
    }

    @task
    *saveTask() {
        // save all records in a single request to `/custom_theme_settings`
        const listRecord = this.store.createRecord('custom-theme-setting-list', {customThemeSettings: this.settings});
        yield listRecord.save();

        this.settings = listRecord.customThemeSettings;

        // don't keep references to lists and their children around
        this.store.unloadRecord(listRecord);

        return this.settings;
    }

    rollback() {
        run(() => this.store.unloadAll('custom-theme-setting'));

        this.settings = [];
    }
}
