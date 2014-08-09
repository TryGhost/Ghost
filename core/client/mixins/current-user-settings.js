var CurrentUserSettings = Ember.Mixin.create({
	currentUser: function () {
		return this.store.find('user', 'me');
	},

	transitionAuthor: function () {
		var self = this;

		return function (user) {
			if (user.get('isAuthor')) {
				return self.transitionTo('settings.users.user', user);
			}

			return user;
		};
	},

	transitionEditor: function () {
		var self = this;

		return function (user) {
			if (user.get('isEditor')) {
				return self.transitionTo('settings.users');
			}

			return user;
		};
	}
});

export default CurrentUserSettings;