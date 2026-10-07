import Ember from 'ember';
import EmberError from '@ember/error';
import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import {computed, set} from '@ember/object';
import {createAdminThemeController} from '@tryghost/admin-x-framework/utils/admin-theme';
import {inject} from 'ghost-admin/decorators/inject';

const LABS_STORAGE_KEY = 'ghost-admin:labs-overrides';

function getStoredFeatureFlagOverrides() {
    try {
        const storedFlags = JSON.parse(sessionStorage.getItem(LABS_STORAGE_KEY) || '[]');

        return Array.isArray(storedFlags) ? storedFlags.filter(flag => typeof flag === 'string') : [];
    } catch (e) {
        return [];
    }
}

export function feature(name, options = {}) {
    const {user, onChange} = options;
    const watchedProps = user
        ? [`accessibility.${name}`]
        : [`config.${name}`, `labs.${name}`, '_featureFlagOverridesRevision'];

    return computed.apply(Ember, watchedProps.concat({
        get() {
            let enabled = false;

            if (user) {
                enabled = this.get(`accessibility.${name}`);
            } else if (getStoredFeatureFlagOverrides().includes(name)) {
                enabled = true;
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

    _resolvedNightShift = undefined;
    _themeController = null;
    _reactThemeConnection = null;
    _themeStylesheetPromise = null;

    @computed('_nightShiftPref', '_resolvedNightShift')
    get nightShift() {
        if (typeof this._resolvedNightShift === 'boolean') {
            return this._resolvedNightShift;
        }
        const preference = this._nightShiftPref;

        return preference === 'dark' || preference === true;
    }

    // user-specific referral invitation
    @feature('referralInviteDismissed', {user: true}) referralInviteDismissed;

    // labs flags
    @feature('stripeAutomaticTax') stripeAutomaticTax;
    @feature('importMemberTier') importMemberTier;
    @feature('adminUIRefresh') adminUIRefresh;
    @feature('editorExcerpt') editorExcerpt;
    @feature('paywallImprovements') paywallImprovements;
    @feature('automations') automations;
    @feature('csvContentImporter') csvContentImporter;
    @feature('membersCustomFields') membersCustomFields;
    @feature('editorReact') editorReact;
    @feature('improveSendingUI') improveSendingUI;
    @feature('billingReact') billingReact;

    // React's auth screens decide before anyone signs in, so both shells read
    // the public /site/ field (copied onto config) and URL overrides, never Labs.
    // Decided once (first asked after /site/ loads), as React holds its answer.
    isAuthReact() {
        if (this._authReact === undefined) {
            this._authReact = getStoredFeatureFlagOverrides().includes('authReact') || this.config.authReact === true;
        }
        return this._authReact;
    }

    _user = null;
    _featureFlagOverridesRevision = 0;

    refreshFeatureFlagOverrides() {
        this.incrementProperty('_featureFlagOverridesRevision');
    }

    @computed('settings.labs')
    get labs() {
        const labs = this.settings.labs;

        try {
            return JSON.parse(labs) || {};
        } catch (e) {
            return {};
        }
    }

    @computed('_user.accessibility')
    get accessibility() {
        const accessibility = this.get('_user.accessibility');

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
        const serviceProperty = options.user ? 'accessibility' : 'labs';
        const model = this.get(options.user ? '_user' : 'settings');
        const featureObject = this.get(serviceProperty);

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
        // Both owners may await the same in-flight link during the boot handoff.
        // lazyLoader otherwise resolves immediately when it sees that link.
        if (!this._themeStylesheetPromise) {
            this._themeStylesheetPromise = this.lazyLoader.loadStyle('dark', 'assets/ghost-dark.css', true).catch((error) => {
                this._themeStylesheetPromise = null;
                document.getElementById('dark-styles')?.remove();
                throw error;
            });
        }
        return this._themeStylesheetPromise;
    }

    _themeAdapter() {
        return {
            preload: () => this._loadAdminThemeStylesheet(),
            apply: (theme) => {
                document.querySelectorAll('link[title=dark]').forEach((link) => {
                    link.disabled = theme !== 'dark';
                });
                set(this, '_resolvedNightShift', theme === 'dark');
            }
        };
    }

    connectAdminTheme() {
        this._themeController?.destroy();
        this._themeController = null;
        const connection = this._themeAdapter();
        this._reactThemeConnection = connection;
        return {
            ...connection,
            disconnect: () => {
                if (this._reactThemeConnection === connection) {
                    this._reactThemeConnection = null;
                    if (!this.isDestroying && !this.isDestroyed) {
                        void this._setAdminTheme();
                    }
                }
            }
        };
    }

    _setAdminTheme(value) {
        // React's preference query drives the connected shell. Ember store
        // refreshes must not overwrite an optimistic selection mid-save.
        if (this._reactThemeConnection) {
            return Promise.resolve();
        }
        const preference = value === undefined ? this._nightShiftPref : value;
        const mode = preference === true ? 'dark' : preference === false ? 'light' : preference;
        const theme = ['light', 'dark', 'system'].includes(mode) ? mode : 'light';
        if (!this._themeController) {
            this._themeController = createAdminThemeController();
            // The initial adapter application is superseded by this preference.
            void this._themeController.setAdapter(this._themeAdapter()).catch(() => {});
        }
        const controller = this._themeController;
        return controller.setTheme(theme).catch(() => {
            if (this.isDestroying || this.isDestroyed || this._reactThemeConnection || this._themeController !== controller) {
                return;
            }
            // Preserve the standalone Ember fallback when a stylesheet fails.
            document.documentElement.classList.remove('dark');
            this._themeAdapter().apply('light');
        });
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this._themeController?.destroy();
    }
}
