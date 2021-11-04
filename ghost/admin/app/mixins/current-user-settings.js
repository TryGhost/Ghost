import Mixin from '@ember/object/mixin';

export default Mixin.create({
    transitionAuthor(user) {
        if (user.isAuthorOrContributor) {
            return this.transitionTo('settings.staff.user', user);
        }
    },

    transitionEditor(user) {
        if (user.isEditor) {
            return this.transitionTo('settings.staff');
        }
    }
});
