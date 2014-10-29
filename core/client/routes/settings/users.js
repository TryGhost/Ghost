import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';

var UsersRoute = AuthenticatedRoute.extend(CurrentUserSettings, {
    beforeModel: function () {
        return this.currentUser()
            .then(this.transitionAuthor());
    }
});

export default UsersRoute;
