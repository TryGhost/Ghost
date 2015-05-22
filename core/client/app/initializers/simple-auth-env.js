import ENV from '../config/environment';
import ghostPaths from 'ghost/utils/ghost-paths';

var Ghost = ghostPaths();

export default {
    name: 'simple-auth-env',
    before: 'simple-auth-oauth2',

    initialize: function () {
        ENV['simple-auth-oauth2'].serverTokenEndpoint = Ghost.apiRoot + '/authentication/token';
        ENV['simple-auth-oauth2'].serverTokenRevocationEndpoint = Ghost.apiRoot + '/authentication/revoke';

        ENV['simple-auth'].localStorageKey = 'ghost' + (Ghost.subdir.indexOf('/') === 0 ? '-' + Ghost.subdir.substr(1) : '') + ':session';
    }
};
