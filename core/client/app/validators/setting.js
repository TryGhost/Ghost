import BaseValidator from './base';

export default BaseValidator.create({
    properties: ['title', 'description', 'password', 'postsPerPage'],
    title(model) {
        let title = model.get('title');

        if (!validator.isLength(title, 0, 150)) {
            model.get('errors').add('title', 'Title is too long');
            this.invalidate();
        }
    },

    description(model) {
        let desc = model.get('description');

        if (!validator.isLength(desc, 0, 200)) {
            model.get('errors').add('description', 'Description is too long');
            this.invalidate();
        }
    },

    password(model) {
        let isPrivate = model.get('isPrivate');
        let password = model.get('password');

        if (isPrivate && password === '') {
            model.get('errors').add('password', 'Password must be supplied');
            this.invalidate();
        }
    },

    postsPerPage(model) {
        let postsPerPage = model.get('postsPerPage');

        if (!validator.isInt(postsPerPage)) {
            model.get('errors').add('postsPerPage', 'Posts per page must be a number');
            this.invalidate();
        } else if (postsPerPage > 1000) {
            model.get('errors').add('postsPerPage', 'The maximum number of posts per page is 1000');
            this.invalidate();
        } else if (postsPerPage < 1) {
            model.get('errors').add('postsPerPage', 'The minimum number of posts per page is 1');
            this.invalidate();
        }
    }
});
