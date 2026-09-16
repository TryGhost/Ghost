// Patches for test mode (locationType 'none'):
// 1. URL-based transitions (e.g. transitionTo('/settings')) cause actual browser
//    navigation. Intercept them and route through the react-fallback catch-all
//    so they stay within the Ember test harness.
// 2. windowProxy.replaceLocation causes actual browser navigation. Redirect to
//    the signin route instead so auth-related tests keep working.

import config from 'ghost-admin/config/environment';
import windowProxy from 'ghost-admin/utils/window-proxy';

export function initialize(appInstance) {
    if (config.environment !== 'test') {
        return;
    }

    const router = appInstance.lookup('service:router');
    const origTransitionTo = router.transitionTo.bind(router);
    const origReplaceWith = router.replaceWith.bind(router);

    // Patch URL-based transitions to prevent actual browser navigation.
    // Non-Ember routes are handled by React; route through Ember's catch-all
    // so the test harness stays intact.
    router.transitionTo = function (...args) {
        if (typeof args[0] === 'string' && args[0].startsWith('/')) {
            return origTransitionTo('react-fallback', args[0].slice(1));
        }
        return origTransitionTo(...args);
    };

    router.replaceWith = function (...args) {
        if (typeof args[0] === 'string' && args[0].startsWith('/')) {
            return origReplaceWith('react-fallback', args[0].slice(1));
        }
        return origReplaceWith(...args);
    };

    // Patch windowProxy to prevent actual browser navigation.
    // replaceLocation is called by requireAuthentication's callback — transition
    // to the signin route instead so auth tests keep working in Ember.
    windowProxy.replaceLocation = function () {
        origTransitionTo('signin');
    };
}

export default {
    name: 'patch-router-url-transitions',
    initialize
};
