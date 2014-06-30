import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var DebugRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
    classNames: ['settings'],

    model: function () {
        return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
            return records.get('firstObject');
        });
    }
});

export default DebugRoute;
