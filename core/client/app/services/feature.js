import Ember from 'ember';

const {
    Service,
    computed,
    inject: {service},
    set
} = Ember;

const EmberError = Ember.Error;

export function feature(name) {
    return computed(`config.${name}`, `labs.${name}`, {
        get() {
            if (this.get(`config.${name}`)) {
                return this.get(`config.${name}`);
            }

            return this.get(`labs.${name}`) || false;
        },
        set(key, value) {
            this.update(key, value);
            return value;
        }
    });
}

export default Service.extend({
    store: service(),
    config: service(),
    notifications: service(),

    publicAPI: feature('publicAPI'),
    subscribers: feature('subscribers'),

    _settings: null,

    labs: computed('_settings.labs', function () {
        let labs = this.get('_settings.labs');

        try {
            return JSON.parse(labs) || {};
        } catch (e) {
            return {};
        }
    }),

    fetch() {
        return this.get('store').queryRecord('setting', {type: 'blog,theme,private'}).then((settings) => {
            this.set('_settings', settings);
            return true;
        });
    },

    update(key, value) {
        let settings = this.get('_settings');
        let labs = this.get('labs');

        // set the new labs key value
        set(labs, key, value);
        // update the 'labs' key of the settings model
        settings.set('labs', JSON.stringify(labs));

        return settings.save().then(() => {
            // return the labs key value that we get from the server
            this.notifyPropertyChange('labs');
            return this.get(`labs.${key}`);

        }).catch((errors) => {
            settings.rollbackAttributes();
            this.notifyPropertyChange('labs');

            // we'll always have an errors object unless we hit a
            // validation error
            if (!errors) {
                throw new EmberError(`Validation of the feature service settings model failed when updating labs.`);
            }

            this.get('notifications').showErrors(errors);

            return this.get(`labs.${key}`);
        });
    }
});
