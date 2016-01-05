import AdaptiveStore from 'ember-simple-auth/session-stores/adaptive';

export default AdaptiveStore.extend({
    localStorageKey: 'ghost:session',
    cookieName: 'ghost:session'
});
