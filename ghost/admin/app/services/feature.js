import Ember from 'ember';
import RSVP from 'rsvp';
import Service from 'ember-service';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import set from 'ember-metal/set';

// ember-cli-shims doesn't export Error
const {Error: EmberError} = Ember;

export function feature(name, user = false) {
    let watchedProps = user ? [`accessibility.${name}`] : [`config.${name}`, `labs.${name}`];

    return computed.apply(Ember, watchedProps.concat({
        get() {
            if (user) {
                return this.get(`accessibility.${name}`);
            }

            if (this.get(`config.${name}`)) {
                return this.get(`config.${name}`);
            }

            return this.get(`labs.${name}`) || false;
        },
        set(key, value) {
            this.update(key, value, user);
            return value;
        }
    }));
}

export default Service.extend({
    store: injectService(),
    config: injectService(),
    session: injectService(),
    settings: injectService(),
    notifications: injectService(),

    publicAPI: feature('publicAPI'),
    subscribers: feature('subscribers'),
    nightShift: feature('nightShift', true),

    _user: null,

    labs: computed('settings.labs', function () {
        let labs = this.get('settings.labs');

        try {
            return JSON.parse(labs) || {};
        } catch (e) {
            return {};
        }
    }),

    accessibility: computed('_user.accessibility', function () {
        let accessibility = this.get('_user.accessibility');

        try {
            return JSON.parse(accessibility) || {};
        } catch (e) {
            return {};
        }
    }),

    fetch() {
        return RSVP.hash({
            settings: this.get('settings').fetch(),
            user: this.get('session.user')
        }).then(({user}) => {
            this.set('_user', user);

            return true;
        });
    },

    update(key, value, user = false) {
        let serviceProperty = user ? 'accessibility' : 'labs';
        let model = this.get(user ? '_user' : 'settings');
        let featureObject = this.get(serviceProperty);

        // set the new key value for either the labs property or the accessibility property
        set(featureObject, key, value);

        // update the 'labs' or 'accessibility' key of the model
        model.set(serviceProperty, JSON.stringify(featureObject));

        return model.save().then(() => {
            // return the labs key value that we get from the server
            this.notifyPropertyChange(serviceProperty);
            return this.get(`${serviceProperty}.${key}`);

        }).catch((error) => {
            model.rollbackAttributes();
            this.notifyPropertyChange(serviceProperty);

            // we'll always have an errors object unless we hit a
            // validation error
            if (!error) {
                throw new EmberError(`Validation of the feature service ${user ? 'user' : 'settings'} model failed when updating ${serviceProperty}.`);
            }

            this.get('notifications').showAPIError(error);

            return this.get(`${serviceProperty}.${key}`);
        });
    }
});
