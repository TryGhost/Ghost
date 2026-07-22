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
            this.update(name, value, options);

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
    @service ghostPaths;
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
        _nightShiftPref;

    _osPrefersDark = false;

    _systemThemeMediaQuery = null;
    _systemThemeListener = null;

    @computed('_nightShiftPref', '_osPrefersDark')
    get nightShift() {
        let preference = this._nightShiftPref;

        if (preference === 'system') {
            return this._osPrefersDark;
        }

        return preference === 'dark' || preference === true;
    }

    // user-specific referral invitation
    @feature('referralInviteDismissed', {user: true}) referralInviteDismissed;

    // labs flags
    @feature('stripeAutomaticTax') stripeAutomaticTax;
    @feature('emailCustomization') emailCustomization;
    @feature('importMemberTier') importMemberTier;
    @feature('adminUIRefresh') adminUIRefresh;
    @feature('lexicalIndicators') lexicalIndicators;
    @feature('editorExcerpt') editorExcerpt;
    @feature('tagsX') tagsX;
    @feature('commentModeration') commentModeration;
    @feature('memberDetailsReact') memberDetailsReact;
    @feature('previewByTier') previewByTier;
    @feature('automations') automations;
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

    _loadAdminThemeStylesheet() {
        return this.lazyLoader.loadStyle('dark', 'assets/ghost-dark.css', true);
    }

    _setAdminTheme(value) {
        let mode = value;

        if (typeof mode === 'undefined') {
            mode = this._nightShiftPref;
        }

        this._removeSystemThemeListener();

        if (mode === true) {
            mode = 'dark';
        } else if (mode === false) {
            mode = 'light';
        } else if (mode !== 'dark' && mode !== 'light' && mode !== 'system') {
            mode = 'light';
        }

        let isDark = mode === 'dark';

        const html = document.documentElement;

        // Double-rAF: first frame paints the new theme, second frame releases
        // the suppression so subsequent hover/focus transitions resume cleanly.
        const releaseSuppression = () => {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                html.classList.remove('theme-switching');
            }));
        };

        if (mode === 'system') {
            let mediaQuery = this._getSystemThemeMediaQuery();
            isDark = mediaQuery?.matches ?? false;
            set(this, '_osPrefersDark', isDark);

            if (mediaQuery) {
                this._systemThemeMediaQuery = mediaQuery;
                this._systemThemeListener = (event) => {
                    html.classList.add('theme-switching');
                    html.classList.toggle('dark', event.matches);
                    $('link[title=dark]').prop('disabled', !event.matches);
                    set(this, '_osPrefersDark', event.matches);
                    releaseSuppression();
                };
                this._addSystemThemeListener();
            }
        } else {
            set(this, '_osPrefersDark', false);
        }

        html.classList.add('theme-switching');
        html.classList.toggle('dark', isDark);
        $('link[title=dark]').prop('disabled', !isDark);

        return this._loadAdminThemeStylesheet().then(() => {
            // In `system` mode the OS theme may have changed while the
            // stylesheet was loading — re-read the current preference so we
            // don't stomp the listener's update with a stale `isDark`.
            const currentIsDark = mode === 'system' ? this._osPrefersDark : isDark;
            html.classList.toggle('dark', currentIsDark);
            $('link[title=dark]').prop('disabled', !currentIsDark);
            releaseSuppression();
        }).catch(() => {
            $('link[title=dark]').prop('disabled', true);
            html.classList.remove('dark');
            releaseSuppression();
        });
    }

    _getSystemThemeMediaQuery() {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return null;
        }

        return window.matchMedia('(prefers-color-scheme: dark)');
    }

    _addSystemThemeListener() {
        if (typeof this._systemThemeMediaQuery?.addEventListener === 'function') {
            this._systemThemeMediaQuery.addEventListener('change', this._systemThemeListener);
        } else if (typeof this._systemThemeMediaQuery?.addListener === 'function') {
            this._systemThemeMediaQuery.addListener(this._systemThemeListener);
        }
    }

    _removeSystemThemeListener() {
        if (this._systemThemeListener) {
            if (typeof this._systemThemeMediaQuery?.removeEventListener === 'function') {
                this._systemThemeMediaQuery.removeEventListener('change', this._systemThemeListener);
            } else if (typeof this._systemThemeMediaQuery?.removeListener === 'function') {
                this._systemThemeMediaQuery.removeListener(this._systemThemeListener);
            }
            this._systemThemeMediaQuery = null;
            this._systemThemeListener = null;
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this._removeSystemThemeListener();
    }
}
