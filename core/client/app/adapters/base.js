import Ember from 'ember';
import RESTAdapter from 'ember-data/adapters/rest';
import ghostPaths from 'ghost/utils/ghost-paths';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';

const {
    inject: {service}
} = Ember;

export default RESTAdapter.extend(DataAdapterMixin, {
    authorizer: 'authorizer:oauth2',

    host: window.location.origin,
    namespace: ghostPaths().apiRoot.slice(1),

    session: service(),

    shouldBackgroundReloadRecord() {
        return false;
    },

    query(store, type, query) {
        let id;

        if (query.id) {
            id = query.id;
            delete query.id;
        }

        return this.ajax(this.buildURL(type.modelName, id), 'GET', {data: query});
    },

    buildURL() {
        // Ensure trailing slashes
        let url = this._super(...arguments);

        if (url.slice(-1) !== '/') {
            url += '/';
        }

        return url;
    },

    // Override deleteRecord to disregard the response body on 2xx responses.
    // This is currently needed because the API is returning status 200 along
    // with the JSON object for the deleted entity and Ember expects an empty
    // response body for successful DELETEs.
    // Non-2xx (failure) responses will still work correctly as Ember will turn
    // them into rejected promises.
    deleteRecord() {
        let response = this._super(...arguments);

        return response.then(() => {
            return null;
        });
    },

    handleResponse(status) {
        if (status === 401) {
            if (this.get('session.isAuthenticated')) {
                this.get('session').invalidate();
                return; // prevent error from bubbling because invalidate is async
            }
        }

        return this._super(...arguments);
    }
});
