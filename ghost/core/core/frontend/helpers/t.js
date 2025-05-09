// # t helper
// i18n: Translatable handlebars expressions for templates of the front-end and themes.
// Front-end: .hbs templates in core/server, overridden by copies in themes. Themes: in content/themes.
//
// Usage examples, for example in .hbs theme templates:
// {{t "Get the latest posts delivered right to your inbox"}}
// {{{t "Proudly published with {ghostlink}" ghostlink="<a href=\"https://ghost.org\">Ghost</a>"}}}
//
// To preserve HTML, use {{{t}}}. This helper doesn't use a SafeString object which would prevent escaping,
// because often other helpers need that (t) returns a string to be able to work as subexpression; e.g.:
// {{tags prefix=(t " on ")}}

const {themeI18n} = require('../services/handlebars');
const {themeI18next} = require('../services/handlebars');
const labs = require('../../shared/labs');
const config = require('../../shared/config');
const settingsCache = require('../../shared/settings-cache');

// Cache of i18n instances per locale
const i18nInstances = new Map();
// Cache of initialization promises per locale
const initPromises = new Map();
// Track initialization state
const initState = new Map();

// Get the site's configured locale
const defaultLocale = settingsCache.get('locale') || 'en';
console.log('Pre-initializing default locale:', defaultLocale);

// Initialize the default instance
const defaultInstance = new themeI18next.ThemeI18n({basePath: themeI18next.basePath});
i18nInstances.set(defaultLocale, defaultInstance);
initState.set(defaultLocale, 'initializing');

// Initialize the default instance immediately
defaultInstance.init({
    activeTheme: settingsCache.get('active_theme'),
    locale: defaultLocale
}).then(() => {
    initState.set(defaultLocale, 'initialized');
}).catch(err => {
    initState.set(defaultLocale, 'error');
    throw err;
});

// Helper to ensure an instance is initialized
function ensureInitialized(locale) {
    
    // If no locale specified, use default
    if (!locale) {
        locale = defaultLocale;
    }
    
    let instance = i18nInstances.get(locale);
    const state = initState.get(locale);
    
    if (!instance) {
        console.log('No instance found for locale:', locale, '- creating new instance');
        // Create new instance for this locale
        instance = new themeI18next.ThemeI18n({basePath: themeI18next.basePath});
        i18nInstances.set(locale, instance);
        initState.set(locale, 'initializing');
        
        // Start initialization
        console.log('Starting initialization for locale:', locale);
        instance.init({
            activeTheme: settingsCache.get('active_theme'),
            locale: locale
        }).then(() => {
            console.log('Initialization completed for locale:', locale);
            initState.set(locale, 'initialized');
        }).catch(err => {
            console.error('Failed to initialize locale:', locale, err);
            initState.set(locale, 'error');
        });
    } else if (state === 'initializing') {
        console.log('Instance exists but still initializing for locale:', locale);
    } else if (state === 'error') {
        console.log('Instance exists but had initialization error for locale:', locale);
    } else {
        console.log('Instance already initialized for locale:', locale);
    }
    
    return instance;
}

module.exports = function t(text, options = {}) {
    if (!text || text.length === 0) {
        // no-op: translation key is missing, return an empty string
        return '';
    }

    const bindings = {};
    let prop;
    for (prop in options.hash) {
        if (Object.prototype.hasOwnProperty.call(options.hash, prop)) {
            bindings[prop] = options.hash[prop];
        }
    }

    if (labs.isSet('themeTranslation')) {
        // Use the new translation package when feature flag is enabled
        const locale = options.data?.root?.locale || defaultLocale;
        
        // Get the instance, ensuring it's initialized
        let instance = i18nInstances.get(locale);
        let usingDefault = false;
        
        if (!instance || initState.get(locale) !== 'initialized') {
            console.log('Locale not initialized:', locale, '- using default locale:', defaultLocale);
            instance = i18nInstances.get(defaultLocale);
            usingDefault = true;
            
            // Start initialization in the background if needed
            if (!i18nInstances.get(locale)) {
                console.log('Starting initialization for locale:', locale);
                ensureInitialized(locale);
            }
        } else {
            console.log('Found initialized instance for locale:', locale);
        }
        
        try {
            const result = instance.t(text, bindings);
            return result;
        } catch (err) {
            // If translation fails, try the default locale as a last resort
            if (!usingDefault) {
                return i18nInstances.get(defaultLocale).t(text, bindings);
            }
            // If we're already using the default locale, return the original text
            return text;
        }
    } else {
        // Use the existing translation package when feature flag is disabled
        
        // Initialize only if needed
        if (!themeI18n._strings) {
            themeI18n.init({
                activeTheme: settingsCache.get('active_theme'),
                locale: defaultLocale
            });
        }
        
        return themeI18n.t(text, bindings);
    }
};
