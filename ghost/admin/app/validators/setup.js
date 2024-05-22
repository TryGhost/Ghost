import NewUserValidator from 'ghost-admin/validators/new-user';
import validator from 'validator';

export default NewUserValidator.create({
    properties: ['name', 'email', 'password', 'blogTitle'],

    blogTitle(model) {
        let blogTitle = model.blogTitle;

        if (!validator.isLength(blogTitle || '', 1)) {
            model.errors.add('blogTitle', 'Please enter a site title.');
            this.invalidate();
        }

        if (!validator.isLength(blogTitle || '', 0, 150)) {
            model.errors.add('blogTitle', 'Title is too long');
            this.invalidate();
        }
    }
});
