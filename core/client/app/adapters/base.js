import DS from 'ember-data';
import ghostPaths from 'ghost/utils/ghost-paths';
import Ember from 'ember';

const {inject} = Ember;

export default DS.RESTAdapter.extend({
    host: window.location.origin,
    namespace: ghostPaths().apiRoot.slice(1),

    session: inject.service('session'),

    shouldBackgroundReloadRecord: function () {
        return false;
    },

    query: function (store, type, query) {
        var id;

        if (query.id) {
            id = query.id;
            delete query.id;
        }

        return this.ajax(this.buildURL(type.modelName, id), 'GET', {data: query});
    },

    buildURL: function (type, id) {
        // Ensure trailing slashes
        var url = this._super(type, id);

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
    deleteRecord: function () {
        var response = this._super.apply(this, arguments);

        return response.then(function () {
            return null;
        });
    },

    handleResponse: function (status) {
        if (status === 401) {
            if (this.get('session.isAuthenticated')) {
                this.get('session').invalidate();
            }
        }

        return this._super(...arguments);
    }
});
