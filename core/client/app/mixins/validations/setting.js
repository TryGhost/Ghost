import {
    validator, buildValidations
} from 'ember-cp-validations';

export default buildValidations({
    title: [
        validator('length', {
            max: 150,
            message: 'Title is too long'
        })
    ],
    description: [
        validator('length', {
            max: 200,
            message: 'Description is too long'
        })
    ],
    password: [
        validator('presence', {
            presence: true,
            dependentKeys: ['isPrivate'],
            disabled() {
                return !this.get('model.isPrivate');
            },
            message: 'Password must be supplied'
        })
    ],
    postsPerPage: [
        validator('number', {
            allowString: true,
            integer: true,
            gt: 1,
            lt: 1000,
            message(type) {
                if (type === 'notAnInteger') {
                    return 'Posts per page must be a number';
                } else if (type === 'lessThan') {
                    return 'The maximum number allowed of posts per page is 1000';
                } else if (type === 'greaterThan') {
                    return 'The minimum number of posts per page is 1';
                }
            }
        })
    ]
});
