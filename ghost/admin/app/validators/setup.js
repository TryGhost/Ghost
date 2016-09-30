import NewUserValidator from 'ghost-admin/validators/new-user';

export default NewUserValidator.create({
    properties: ['name', 'email', 'password', 'blogTitle', 'session'],

    blogTitle(model) {
        let blogTitle = model.get('blogTitle');

        if (!validator.isLength(blogTitle, 1)) {
            model.get('errors').add('blogTitle', 'Please enter a blog title.');
            this.invalidate();
        }
    },

    session(model) {
        let usingOAuth = model.get('config.ghostOAuth');
        let isAuthenticated = model.get('session.isAuthenticated');

        if (usingOAuth && !isAuthenticated) {
            model.get('errors').add('session', 'Please connect a Ghost.org account before continuing');
            model.get('hasValidated').pushObject('session');
            this.invalidate();
        }
    }
});
