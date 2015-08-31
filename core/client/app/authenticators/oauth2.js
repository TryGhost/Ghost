import Ember from 'ember';
import Authenticator from 'simple-auth-oauth2/authenticators/oauth2';

export default Authenticator.extend({
    config: Ember.inject.service(),
    makeRequest: function (url, data) {
        data.client_id = this.get('config.clientId');
        data.client_secret = this.get('config.clientSecret');
        return this._super(url, data);
    }
});
