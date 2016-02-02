import Ember from 'ember';

const {
    Service,
    computed,
    inject: {service},
    RSVP: {Promise},
    set
} = Ember;

export function feature(name) {
    return computed(`config.${name}`, `labs.${name}`, {
        get() {
            return new Promise((resolve) => {
                if (this.get(`config.${name}`)) {
                    return resolve(this.get(`config.${name}`));
                }

                this.get('labs').then((labs) => {
                    resolve(labs[name] || false);
                });
            });
        },
        set(key, value) {
            this.update(key, value).then((savedValue) => {
                return savedValue;
            });
        }
    });
}

export default Service.extend({
    store: service(),
    config: service(),
    notifications: service(),

    _settings: null,

    publicAPI: feature('publicAPI'),

    _parseLabs(settings) {
        let labs = settings.get('labs');

        try {
            return JSON.parse(labs) || {};
        } catch (e) {
            return {};
        }
    },

    labs: computed('_settings', function () {
        return new Promise((resolve, reject) => {
            if (this.get('_settings')) { // So we don't query the backend every single time
                resolve(this._parseLabs(this.get('_settings')));
            }
            let store = this.get('store');

            store.query('setting', {type: 'blog'}).then((settings) => {
                let setting = settings.get('firstObject');

                this.set('_settings', setting);
                resolve(this._parseLabs(setting));
            }).catch(reject);
        });
    }),

    update(key, value) {
        return new Promise((resolve, reject) => {
            this.get('labs').then((labs) => {
                let settings = this.get('_settings');

                set(labs, key, value);

                settings.set('labs', JSON.stringify(labs));
                settings.save().then((savedSettings) => {
                    this.set('_settings', savedSettings);
                    resolve(this._parseLabs(savedSettings).get(key));
                }).catch((errors) => {
                    this.get('notifications').showErrors(errors);
                    settings.rollbackAttributes();
                    resolve(this._parseLabs(settings)[key]);
                });
            }).catch(reject);
        });
    }
});
