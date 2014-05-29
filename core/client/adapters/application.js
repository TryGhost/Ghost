import ghostPaths from 'ghost/utils/ghost-paths';

// export default DS.FixtureAdapter.extend({});

export default DS.RESTAdapter.extend({
    host: window.location.origin,
    namespace: ghostPaths().apiRoot.slice(1),
    headers: {
        'X-CSRF-Token': $('meta[name="csrf-param"]').attr('content')
    },

    buildURL: function (type, id) {
        // Ensure trailing slashes
        var url = this._super(type, id);

        if (url.slice(-1) !== '/') {
            url += '/';
        }

        return url;
    }
});