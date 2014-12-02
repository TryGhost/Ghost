import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var LabsRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
    titleToken: 'Labs',

    classNames: ['settings'],
    beforeModel: function () {
        return this.currentUser()
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model: function () {
        return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    }
});

export default LabsRoute;
