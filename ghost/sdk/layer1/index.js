/* global document */
var layer0 = require('@tryghost/members-layer0');
var events = require('minivents');

function create(options) {
    var bus = new events();
    var loadGateway = new Promise(function (resolve) {
        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.src = `${options.blogUrl}/members/gateway`;
        frame.onload = function () {
            resolve(layer0(frame));
        };
        document.body.appendChild(frame);
    }).then(function (gateway) {
        gateway.listen(function (data) {
            bus.emit(data.event, data.payload);
        });
        return gateway;
    });

    var loadAuth = new Promise(function (resolve) {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.display = 'none';
        frame.style.width = '400px';
        frame.style.height = '600px';
        frame.style.background = 'lightgray';
        frame.style.top = '20vw';
        frame.style.margin = '0 -200px 0';
        frame.style.left = '50%';
        frame.style['z-index'] = '9000';
        frame.src = `${options.blogUrl}/members/auth`;
        frame.onload = function () {
            resolve(frame);
        };
        document.body.appendChild(frame);
    });

    return {
        getToken: function getToken() {
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
            return loadAuth.then(function (frame) {
                frame.style.display = 'block';
                return new Promise(function (resolve) {
                    bus.on('signedin', function self() {
                        bus.off('signedin', self);
                        resolve(true);
                    });
                });
            });
        },

        logout: function logout() {
            return loadGateway.then(function (gateway) {
                return new Promise(function (resolve, reject) {
                    gateway.call('signout', {}, function (err, successful) {
                        if (err) {
                            reject(err);
                        }
                        resolve(successful);
                    });
                });
            });
        }
    };
}

module.exports.create = create;
