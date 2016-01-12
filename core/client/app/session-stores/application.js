import AdaptiveStore from 'ember-simple-auth/session-stores/adaptive';
import ghostPaths from 'ghost/utils/ghost-paths';

const paths = ghostPaths();
const keyName = `ghost${(paths.subdir.indexOf('/') === 0 ? `-${paths.subdir.substr(1)}` : ``) }:session`;

export default AdaptiveStore.extend({
    localStorageKey: keyName,
    cookieName: keyName
});
