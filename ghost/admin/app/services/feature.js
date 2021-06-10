import $ from 'jquery';
import Ember from 'ember';
import EmberError from '@ember/error';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import {computed} from '@ember/object';
import {set} from '@ember/object';

export function feature(name, options = {}) {
    let {user, onChange} = options;
    let watchedProps = user ? [`accessibility.${name}`] : [`config.${name}`, `labs.${name}`];

    return computed.apply(Ember, watchedProps.concat({
        get() {
            let enabled = false;

            if (user) {
                enabled = this.get(`accessibility.${name}`);
            } else if (this.get(`config.${name}`)) {
                enabled = this.get(`config.${name}`);
            } else {
                enabled = this.get(`labs.${name}`) || false;
            }

            if (options.developer) {
                enabled = enabled && this.get('config.enableDeveloperExperiments');
            }

            return enabled;
        },
        set(key, value) {
            this.update(key, value, options);

            if (onChange) {
                // value must be passed here because the value isn't set until
                // the setter function returns
                this.get(onChange).bind(this)(value);
            }

            return value;
        }
    }));
}

export default Service.extend({
    store: service(),
    config: service(),
    session: service(),
    settings: service(),
    notifications: service(),
    lazyLoader: service(),

    emailAnalytics: feature('emailAnalytics'),
    nightShift: feature('nightShift', {user: true, onChange: '_setAdminTheme'}),
    launchComplete: feature('launchComplete', {user: true}),
    matchHelper: feature('matchHelper'),
    multipleProducts: feature('multipleProducts', {developer: true}),
    featureImageMeta: feature('featureImageMeta', {developer: true}),

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
            settings: this.settings.fetch(),
            user: this.get('session.user')
        }).then(({user}) => {
            this.set('_user', user);
            return this._setAdminTheme().then(() => true);
        });
    },

    update(key, value, options = {}) {
        let serviceProperty = options.user ? 'accessibility' : 'labs';
        let model = this.get(options.user ? '_user' : 'settings');
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
                throw new EmberError(`Validation of the feature service ${options.user ? 'user' : 'settings'} model failed when updating ${serviceProperty}.`);
            }

            this.notifications.showAPIError(error);

            return this.get(`${serviceProperty}.${key}`);
        });
    },

    _setAdminTheme(enabled) {
        let nightShift = enabled;

        if (typeof nightShift === 'undefined') {
            nightShift = enabled || this.nightShift;
        }

        return this.lazyLoader.loadStyle('dark', 'assets/ghost-dark.css', true).then(() => {
            $('link[title=dark]').prop('disabled', !nightShift);
        }).catch(() => {
            //TODO: Also disable toggle from settings and Labs hover
            $('link[title=dark]').prop('disabled', true);
        });
    }
});
