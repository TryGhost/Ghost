import Service, {inject as service} from '@ember/service';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {tracked} from '@glimmer/tracking';

export default class SettingsService extends Service.extend(ValidationEngine) {
    @service store;

    // will be set to the single Settings model, it's a reference so any later
    // changes to the settings object in the store will be reflected
    settingsModel = null;

    validationType = 'setting';
    _loadingPromise = null;

    // this is an odd case where we only want to react to changes that we get
    // back from the API rather than local updates
    @tracked settledIcon = '';

    get hasDirtyAttributes() {
        return this.settingsModel?.hasDirtyAttributes || false;
    }

    get mailgunIsConfigured() {
        return this.mailgunApiKey && this.mailgunDomain && this.mailgunBaseUrl;
    }

    // the settings API endpoint is a little weird as it's singular and we have
    // to pass in all types - if we ever fetch settings without all types then
    // save we have problems with the missing settings being removed or reset
    _loadSettings() {
        if (!this._loadingPromise) {
            this._loadingPromise = this.store
                .queryRecord('setting', {group: 'site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments'})
                .then((settings) => {
                    this._loadingPromise = null;
                    return settings;
                });
        }

        return this._loadingPromise;
    }

    async fetch() {
        if (!this.settingsModel) {
            return this.reload();
        } else {
            return this;
        }
    }

    async reload() {
        const settingsModel = await this._loadSettings();

        this.settingsModel = settingsModel;
        this.settledIcon = settingsModel.icon;

        settingsModel.eachAttribute((name) => {
            if (!Object.prototype.hasOwnProperty.call(this, name)) {
                Object.defineProperty(this, name, {
                    get() {
                        return this.settingsModel[name];
                    },
                    set(newValue) {
                        this.settingsModel[name] = newValue;
                    }
                });
            }
        });

        return this;
    }

    async save() {
        const {settingsModel} = this;

        if (!settingsModel) {
            return false;
        }

        await settingsModel.save();
        await this.validate();

        this.settledIcon = settingsModel.icon;

        return this;
    }

    rollbackAttributes() {
        return this.settingsModel?.rollbackAttributes();
    }

    changedAttributes() {
        return this.settingsModel?.changedAttributes();
    }
}
