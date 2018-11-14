var jwt = require('jsonwebtoken');
var store = window.localStorage;

function create(options) {
    return {
        getToken: function getToken() {
            var token = store.getItem('members-token') || null;
            return Promise.resolve(token);
        },

        login: function login() {
            var token = jwt.sign({}, null, {algorithm: 'none'});
            store.setItem('members-token', token);
            return Promise.resolve(!!token);
        },

        logout: function logout() {
            store.removeItem('members-token');
            return Promise.resolve(true);
        }
    };
}

module.exports.create = create;
