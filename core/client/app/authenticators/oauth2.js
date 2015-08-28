import Authenticator from 'simple-auth-oauth2/authenticators/oauth2';

export default Authenticator.extend({
    makeRequest: function (url, data) {
        data.client_id = 'ghost-admin';
        return this._super(url, data);
    }
});
