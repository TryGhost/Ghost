import AjaxServiceSupport from 'ember-ajax/mixins/ajax-support';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';
import RESTAdapter from 'ember-data/adapters/rest';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {inject as service} from '@ember/service';

export default RESTAdapter.extend(DataAdapterMixin, AjaxServiceSupport, {
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
    }
});
