import {
    validator, buildValidations
} from 'ember-cp-validations';

export default buildValidations({
    identification: [
        validator('presence', {
            presence: true,
            ignoreBlank: true,
            message: 'Please enter an email'
        }),
        validator('format', {
            type: 'email',
            message: 'Email address is not valid'
        }),
        validator('signin', {
            dependentKeys: ['invalidProperty']
        })
    ],

    password: [
        validator('presence', {
            presence: true,
            ignoreBlank: true,
            message: 'Please enter a password'
        }),
        validator('signin', {
            dependentKeys: ['invalidProperty']
        })
    ]
});
