const jwt = require('jsonwebtoken');
const store = window.localStorage;

const create = (options) => {
    return {
        getToken() {
            let token = store.getItem('members-token') || null;
            return Promise.resolve(token);
        },

        login() {
            let token = jwt.sign({}, null, {algorithm: 'none'});
            store.setItem('members-token', token);
            return Promise.resolve(!!token);
        },

        logout() {
            store.setItem('members-token', null);
            return Promise.resolve(true);
        }
    }
};

module.exports.create = create;
