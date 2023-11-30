import Service, {inject as service} from '@ember/service';
import nql from '@tryghost/nql';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const HIDDEN_SETTING_VALUE = null;

export default class CustomThemeSettingsServices extends Service {
    @service store;

    @tracked settings = [];
    @tracked settingGroups = [];

    _hasLoaded = false;

    KNOWN_GROUPS = [{
        key: 'homepage',
        name: 'Homepage',
        icon: 'house',
        previewType: 'homepage'
    }, {
        key: 'post',
        name: 'Post',
        icon: 'post',
        previewType: 'post'
    }];

    get isDirty() {
        const dirtySetting = this.settings.find(setting => setting.hasDirtyAttributes);
        return !!dirtySetting;
    }

    get keyValueObject() {
        const keyValue = {};

        this.settings.forEach((setting) => {
            keyValue[setting.key] = this._isSettingVisible(setting) ? setting.value : HIDDEN_SETTING_VALUE;
        });

        return keyValue;
    }

    load() {
        return this.loadTask.perform();
    }

    reload() {
        this._hasLoaded = false;

        return this.loadTask.perform();
    }

    @task
    *loadTask() {
        if (this.hasLoaded) {
            return this.settings;
        }

        // unload stored settings and re-load from API so they always match active theme
        // run is required here, see https://github.com/emberjs/data/issues/5447#issuecomment-845672812
        run(() => this.store.unloadAll('custom-theme-setting'));

        const settings = yield this.store.findAll('custom-theme-setting');
        this.settings = settings;
        this.settingGroups = this._buildSettingGroups(settings);

        this.updateSettingsVisibility();

        this._hasLoaded = true;

        return this.settings;
    }

    save() {
        return this.saveTask.perform();
    }

    @task
    *saveTask() {
        if (isEmpty(this.settings)) {
            return this.settings;
        }

        // save all records in a single request to `/custom_theme_settings`
        const listRecord = this.store.createRecord('custom-theme-setting-list', {customThemeSettings: this.settings});
        yield listRecord.save();

        // don't keep references to lists and their children around
        this.store.unloadRecord(listRecord);

        return this.settings;
    }

    rollback() {
        this.settings.forEach(setting => setting.rollbackAttributes());
    }

    updateSettingsVisibility() {
        this.settings.forEach((setting) => {
            setting.visible = this._isSettingVisible(setting);

            // Updating the setting visibility will cause the setting to be marked as dirty so
            // we need to compute whether the setting is actually dirty and set the flag manually
            const changedProperties = Object.keys(setting.changedAttributes()).filter(key => key !== 'visible');

            setting.hasDirtyAttributes = false;

            if (changedProperties.length > 0) {
                setting.hasDirtyAttributes = true;
            }
        });
    }

    _buildSettingGroups(settings) {
        if (!settings || !settings.length) {
            return [];
        }

        const groupKeys = this.KNOWN_GROUPS.map(g => g.key);
        const groups = [];

        const siteWideSettings = settings.filter(setting => !groupKeys.includes(setting.group));
        if (siteWideSettings.length) {
            groups.push({
                key: 'site-wide',
                name: 'Site-wide',
                icon: 'view-site',
                settings: siteWideSettings
            });
        }

        this.KNOWN_GROUPS.forEach((knownGroup) => {
            const groupSettings = settings.filter(setting => setting.group === knownGroup.key);

            if (groupSettings.length) {
                groups.push(Object.assign({}, knownGroup, {settings: groupSettings}));
            }
        });

        return groups;
    }

    _isSettingVisible(setting) {
        if (!setting.visibility) {
            return true;
        }

        const settingsMap = this.settings.reduce((map, {key, value}) => ({...map, [key]: value}), {});

        return nql(setting.visibility).queryJSON(settingsMap);
    }
}
