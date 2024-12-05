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

@classic
export default class FeatureService extends Service {
    @service lazyLoader;
    @service notifications;
    @service session;
    @service settings;
    @service store;

    @inject config;

    @feature('emailAnalytics') emailAnalytics;

    @feature('nightShift', {user: true, onChange: '_setAdminTheme'})
    nightShift;
    @feature('pwa', {user: true ,onChange:'_setPwa'})
        pwa;

    @feature('referralInviteDismissed', {user: true}) referralInviteDismissed;

    @feature('urlCache') urlCache;
    @feature('lexicalMultiplayer') lexicalMultiplayer;
    @feature('audienceFeedback') audienceFeedback;
    @feature('webmentions') webmentions;
    @feature('stripeAutomaticTax') stripeAutomaticTax;
    @feature('emailCustomization') emailCustomization;
    @feature('i18n') i18n;
    @feature('announcementBar') announcementBar;
    @feature('signupCard') signupCard;
    @feature('collections') collections;
    @feature('mailEvents') mailEvents;
    @feature('collectionsCard') collectionsCard;
    @feature('importMemberTier') importMemberTier;
    @feature('lexicalIndicators') lexicalIndicators;
    @feature('adminXDemo') adminXDemo;
    @feature('ActivityPub') ActivityPub;
    @feature('editorExcerpt') editorExcerpt;
    @feature('contentVisibility') contentVisibility;
    @feature('commentImprovements') commentImprovements;

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

    fetch() {
        return this.settings.fetch().then(() => {
            this.set('_user', this.session.user);
            return this._setAdminTheme().then(() => true);
        });
    }

    update(key, value, options = {}) {
        let serviceProperty = options.user ? 'accessibility' : 'labs';
        let model = this.get(options.user ? '_user' : 'settings');
        let featureObject = this.get(serviceProperty);

        set(featureObject, key, value);

        if (options.requires && value === true) {
            options.requires.forEach((flag) => {
                set(featureObject, flag, true);
            });
        }

        model.set(serviceProperty, JSON.stringify(featureObject));

        return model.save().then(() => {
            this.notifyPropertyChange(serviceProperty);
            return this.get(`${serviceProperty}.${key}`);
        }).catch((error) => {
            model.rollbackAttributes();
            this.notifyPropertyChange(serviceProperty);

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

        return this.lazyLoader.loadStyle('dark', 'assets/ghost-dark.css', true).then(() => {
            $('link[title=dark]').prop('disabled', !nightShift);
        }).catch(() => {
            //TODO: Also disable toggle from settings and Labs hover
            $('link[title=dark]').prop('disabled', true);
        });
    }

    _setPwa(enabled) {
        console.log(`PWA is now ${enabled ? 'enabled' : 'disabled'}`);
    }
}