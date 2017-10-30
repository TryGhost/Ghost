import Ember from 'ember';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {get} from '@ember/object';

// ember-cli-shims doesn't export _ProxyMixin
const {_ProxyMixin} = Ember;

export default Service.extend(_ProxyMixin, ValidationEngine, {
    store: service(),

    // will be set to the single Settings model, it's a reference so any later
    // changes to the settings object in the store will be reflected
    content: null,

    validationType: 'setting',
    _loadingPromise: null,

    // this is an odd case where we only want to react to changes that we get
    // back from the API rather than local updates
    settledIcon: '',

    // the settings API endpoint is a little weird as it's singular and we have
    // to pass in all types - if we ever fetch settings without all types then
    // save we have problems with the missing settings being removed or reset
    _loadSettings() {
        if (!this._loadingPromise) {
            this._loadingPromise = this.get('store')
                .queryRecord('setting', {type: 'blog,theme,private'})
                .then((settings) => {
                    this._loadingPromise = null;
                    return settings;
                });
        }

        return this._loadingPromise;
    },

    fetch() {
        if (!this.get('content')) {
            return this.reload();
        } else {
            return RSVP.resolve(this);
        }
    },

    reload() {
        return this._loadSettings().then((settings) => {
            this.set('content', settings);
            this.set('settledIcon', get(settings, 'icon'));
            return this;
        });
    },

    save() {
        let settings = this.get('content');

        if (!settings) {
            return false;
        }

        return settings.save().then((settings) => {
            this.set('settledIcon', get(settings, 'icon'));
            return settings;
        });
    },

    rollbackAttributes() {
        return this.get('content').rollbackAttributes();
    }
});
