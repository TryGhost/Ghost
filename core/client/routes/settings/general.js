import AuthenticatedRoute from 'ghost/routes/authenticated';

var SettingsGeneralRoute = AuthenticatedRoute.extend({
    model: function () {
        return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
            return records.get('firstObject');
        });
    }
});

export default SettingsGeneralRoute;
