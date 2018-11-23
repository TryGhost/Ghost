/* global document window */
var layer0 = require('@tryghost/members-layer0');
var store = window.localStorage;

function create(options) {
    var loadGateway = new Promise(function (resolve) {
        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.src = `${options.blogUrl}/members/gateway`;
        frame.onload = function () {
            resolve(layer0(frame));
        };
        document.body.appendChild(frame);
    });

    return {
        getToken: function getToken() {
            if (!store.getItem('loggedin')) {
                return Promise.resolve(null);
            }
            return loadGateway.then(function (gateway) {
                return new Promise(function (resolve, reject) {
                    gateway.call('getToken', {}, function (err, token) {
                        if (err) {
                            reject(err);
                        }
                        resolve(token);
                    });
                });
            });
        },

        login: function login() {
            store.setItem('loggedin', true);
            return Promise.resolve(true);
        },

        logout: function logout() {
            store.removeItem('loggedin');
            return Promise.resolve(true);
        }
    };
}

module.exports.create = create;
