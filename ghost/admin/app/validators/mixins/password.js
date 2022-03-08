import Mixin from '@ember/object/mixin';
import validator from 'validator';

const BAD_PASSWORDS = [
    '1234567890',
    'qwertyuiop',
    'qwertzuiop',
    'asdfghjkl;',
    'abcdefghij',
    '0987654321',
    '1q2w3e4r5t',
    '12345asdfg'
];
const DISALLOWED_PASSWORDS = ['ghost', 'password', 'passw0rd'];

export default Mixin.create({
    /**
    * Counts repeated characters if a string. When 50% or more characters are the same,
    * we return false and therefore invalidate the string.
    * @param {String} stringToTest The password string to check.
    * @return {Boolean}
    */
    _characterOccurance(stringToTest) {
        let chars = {};
        let allowedOccurancy;
        let valid = true;

        allowedOccurancy = stringToTest.length / 2;

        // Loop through string and accumulate character counts
        for (let i = 0; i < stringToTest.length; i += 1) {
            if (!chars[stringToTest[i]]) {
                chars[stringToTest[i]] = 1;
            } else {
                chars[stringToTest[i]] += 1;
            }
        }

        // check if any of the accumulated chars exceed the allowed occurancy
        // of 50% of the words' length.
        for (let charCount in chars) {
            if (chars[charCount] >= allowedOccurancy) {
                valid = false;
                return valid;
            }
        }

        return valid;
    },

    passwordValidation(model, password, errorTarget) {
        let blogUrl = model.get('config.blogUrl') || window.location.host;
        let blogTitle = model.get('blogTitle') || model.get('config.blogTitle');
        let blogUrlWithSlash;

        // the password that needs to be validated can differ from the password in the
        // passed model, e. g. for password changes or reset.
        password = password || model.get('password');
        errorTarget = errorTarget || 'password';

        blogUrl = blogUrl.replace(/^http(s?):\/\//, '');
        blogUrlWithSlash = blogUrl.match(/\/$/) ? blogUrl : `${blogUrl}/`;

        blogTitle = blogTitle ? blogTitle.trim().toLowerCase() : blogTitle;

        // password must be longer than 10 characters
        if (!validator.isLength(password || '', 10)) {
            model.get('errors').add(errorTarget, 'Password must be at least 10 characters long.');
            return this.invalidate();
        }

        password = password.toString();

        // dissallow password from badPasswords list (e. g. '1234567890')
        BAD_PASSWORDS.map((badPassword) => {
            if (badPassword === password) {
                model.get('errors').add(errorTarget, 'Sorry, you cannot use an insecure password.');
                this.invalidate();
            }
        });

        // password must not match with users' email
        if (password.toLowerCase() === model.get('email').toLowerCase()) {
            model.get('errors').add(errorTarget, 'Sorry, you cannot use an insecure password.');
            this.invalidate();
        }

        // password must not contain the words 'ghost', 'password', or 'passw0rd'
        DISALLOWED_PASSWORDS.map((disallowedPassword) => {
            if (password.toLowerCase().indexOf(disallowedPassword) >= 0) {
                model.get('errors').add(errorTarget, 'Sorry, you cannot use an insecure password.');
                this.invalidate();
            }
        });

        // password must not match with blog title
        if (password.toLowerCase() === blogTitle) {
            model.get('errors').add(errorTarget, 'Sorry, you cannot use an insecure password.');
            this.invalidate();
        }

        // password must not match with blog URL (without protocol, with or without trailing slash)
        if (password.toLowerCase() === blogUrl || password.toLowerCase() === blogUrlWithSlash) {
            model.get('errors').add(errorTarget, 'Sorry, you cannot use an insecure password.');
            this.invalidate();
        }

        // dissallow passwords where 50% or more of characters are the same
        if (!this._characterOccurance(password)) {
            model.get('errors').add(errorTarget, 'Sorry, you cannot use an insecure password.');
            this.invalidate();
        }
    }
});
