import Ember from 'ember';

const {
    RSVP,
    Service,
    computed,
    inject: {service},
    set,
    defineProperty
} = Ember;

const {Promise} = RSVP;

const EmberError = Ember.Error;

export function feature(featureService, name) {
    let internalName = `_${name}`;
    let syncName = `${name}Sync`;

    // define the computed property that always returns a promise
    defineProperty(featureService, name, computed(`config.${name}`, `labs.${name}`, {
        get() {
            return new Promise((resolve) => {
                if (this.get(`config.${name}`)) {
                    let result = this.get(`config.${name}`);

                    this.set(internalName, result);
                    return resolve(result);
                }

                this.get('labs').then((labs) => {
                    let result = labs[name] || false;

                    this.set(internalName, result);
                    resolve(result);
                });
            });
        },
        set(key, value) {
            return this.update(key, value).then((savedValue) => {
                this.set(internalName, savedValue);
                return savedValue;
            });
        }
    }));

    // define the raw internal property
    defineProperty(featureService, internalName, undefined, false);

    // define a flagSync property so that it can be used in things that need
    // a syncronous value
    defineProperty(featureService, syncName, computed(internalName, function () {
        this.get(name); // force computed property to compute
        return this.get(internalName);
    }));
}

export default Service.extend({
    store: service(),
    config: service(),
    notifications: service(),

    init() {
        this._super(...arguments);

        feature(this, 'publicAPI');
    },

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
