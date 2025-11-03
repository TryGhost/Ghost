import $ from 'jquery';
import Ember from 'ember';
import EmberError from '@ember/error';
import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import {computed, set} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';

export function feature(name, options = {}) {
    let {user, onChange} = options;
    let watchedProps = user ? [`accessibility.${name}`] : [`config.${name}`, `labs.${name}`];

    return computed.apply(Ember, watchedProps.concat({
        get() {
            let enabled = false;

            if (user) {
                enabled = this.get(`accessibility.${name}`);
            } else if (typeof this.get(`config.${name}`) === 'boolean') {
                enabled = this.get(`config.${name}`);
            } else {
                enabled = this.get(`labs.${name}`) || false;
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

// Cookie utilities for admin forward functionality
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/ghost/`;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/ghost/`;
}

@classic
export default class FeatureService extends Service {
    @service lazyLoader;
    @service notifications;
    @service session;
    @service settings;
    @service store;

    @inject config;

    // features
    @feature('emailAnalytics') emailAnalytics;

    // user-specific flags
    @feature('nightShift', {user: true, onChange: '_setAdminTheme'})
        nightShift;

    // user-specific referral invitation
    @feature('referralInviteDismissed', {user: true}) referralInviteDismissed;

    // labs flags
    @feature('adminForward') adminForward;
    @feature('audienceFeedback') audienceFeedback;
    @feature('webmentions') webmentions;
    @feature('stripeAutomaticTax') stripeAutomaticTax;
    @feature('emailCustomization') emailCustomization;
    @feature('i18n') i18n;
    @feature('announcementBar') announcementBar;
    @feature('importMemberTier') importMemberTier;
    @feature('lexicalIndicators') lexicalIndicators;
    @feature('editorExcerpt') editorExcerpt;
    @feature('contentVisibility') contentVisibility;
    @feature('contentVisibilityAlpha') contentVisibilityAlpha;
    @feature('tagsX') tagsX;
    @feature('utmTracking') utmTracking;

    _user = null;

    @computed('settings.labs')
    get labs() {
        let labs = this.settings.labs;

        try {
            return JSON.parse(labs) || {};
        } catch (e) {
            return {};
        }
    }

    @computed('_user.accessibility')
    get accessibility() {
        let accessibility = this.get('_user.accessibility');

        try {
            return JSON.parse(accessibility) || {};
        } catch (e) {
            return {};
        }
    }

    get inAdminForward() {
        // Detect if Ember is running inside the React admin shell
        // In React shell: Ember renders to #ember-app
        // Standalone: Ember renders to body (no #ember-app element)
        return document.querySelector('#ember-app') !== null;
    }

    _reconcileAdminForwardState() {
        // Only proceed if we're on a *.ghost.io or *.ghost.is domain
        const hostname = window.location.hostname;
        if (!hostname.endsWith('.ghost.io') && !hostname.endsWith('.ghost.is')) {
            return;
        }

        const cookieName = 'ghost-admin-forward';
        const hasAdminForwardCookie = !!getCookie(cookieName);

        // Update cookie based on feature flag
        if (hasAdminForwardCookie && !this.adminForward) {
            deleteCookie(cookieName);
        } else if (!hasAdminForwardCookie && this.adminForward) {
            setCookie(cookieName, '1', 365);
        }

        // Reload if flag state doesn't match current wrapper
        // (flag enabled but in Ember standalone, or flag disabled but in React shell)
        if (this.adminForward !== this.inAdminForward) {
            window.location.reload();
        }
    }

    fetch() {
        return this.settings.fetch().then(() => {
            this.set('_user', this.session.user);
            this._reconcileAdminForwardState();
            return this._setAdminTheme().then(() => true);
        });
    }

    update(key, value, options = {}) {
        let serviceProperty = options.user ? 'accessibility' : 'labs';
        let model = this.get(options.user ? '_user' : 'settings');
        let featureObject = this.get(serviceProperty);

        // set the new key value for either the labs property or the accessibility property
        set(featureObject, key, value);

        if (options.requires && value === true) {
            options.requires.forEach((flag) => {
                set(featureObject, flag, true);
            });
        }

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
    }

    _setAdminTheme(enabled) {
        let nightShift = enabled;

        if (typeof nightShift === 'undefined') {
            nightShift = enabled || this.nightShift;
        }

        document.documentElement.classList.toggle('dark', nightShift ?? false);

        return this.lazyLoader.loadStyle('dark', 'assets/ghost-dark.css', true).then(() => {
            $('link[title=dark]').prop('disabled', !nightShift);
        }).catch(() => {
            //TODO: Also disable toggle from settings and Labs hover
            $('link[title=dark]').prop('disabled', true);
            document.documentElement.classList.remove('dark');
        });
    }
}
