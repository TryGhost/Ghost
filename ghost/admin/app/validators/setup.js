import NewUserValidator from 'ghost-admin/validators/new-user';

export default NewUserValidator.create({
    properties: ['name', 'email', 'password', 'blogTitle'],

    blogTitle(model) {
        let blogTitle = model.get('blogTitle');

        if (!validator.isLength(blogTitle, 1)) {
            model.get('errors').add('blogTitle', 'Please enter a blog title.');
            this.invalidate();
        }

        if (!validator.isLength(blogTitle, 0, 150)) {
            model.get('errors').add('blogTitle', 'Title is too long');
            this.invalidate();
        }
    }
});
