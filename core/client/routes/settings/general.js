import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SettingsGeneralRoute = AuthenticatedRoute.extend(loadingIndicator, {
    model: function () {
        return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
            return records.get('firstObject');
        });
    }
});

export default SettingsGeneralRoute;
