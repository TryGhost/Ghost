import Ember from 'ember';

const {
    RSVP,
    Service,
    computed,
    inject: {service},
    set
} = Ember;

const {Promise} = RSVP;

const EmberError = Ember.Error;

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
            return this.update(key, value).then((savedValue) => {
                return savedValue;
            });
        }
    });
}

export default Service.extend({
    store: service(),
    config: service(),
    notifications: service(),

    publicAPI: feature('publicAPI'),

    labs: computed('_settings', function () {
        return this.get('_settings').then((settings) => {
            return this._parseLabs(settings);
        });
    }),

    _settings: computed(function () {
        let store = this.get('store');

        return store.queryRecord('setting', {type: 'blog'});
    }),

    _parseLabs(settings) {
        let labs = settings.get('labs');

        try {
            return JSON.parse(labs) || {};
        } catch (e) {
            return {};
        }
    },

    update(key, value) {
        return new Promise((resolve, reject) => {
            let promises = {
                settings: this.get('_settings'),
                labs: this.get('labs')
            };

            RSVP.hash(promises).then(({labs, settings}) => {
                // set the new labs key value
                set(labs, key, value);
                // update the 'labs' key of the settings model
                settings.set('labs', JSON.stringify(labs));

                settings.save().then((savedSettings) => {
                    // replace the cached _settings promise
                    this.set('_settings', RSVP.resolve(savedSettings));

                    // return the labs key value that we get from the server
                    resolve(this._parseLabs(savedSettings).get(key));

                }).catch((errors) => {
                    settings.rollbackAttributes();

                    // we'll always have an errors object unless we hit a
                    // validation error
                    if (!errors) {
                        throw new EmberError(`Validation of the feature service settings model failed when updating labs.`);
                    }

                    this.get('notifications').showErrors(errors);

                    resolve(this._parseLabs(settings)[key]);
                });
            }).catch(reject);
        });
    }
});
