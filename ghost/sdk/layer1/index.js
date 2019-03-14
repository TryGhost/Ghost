/* global document */
var layer0 = require('@tryghost/members-layer0');
var events = require('minivents');

module.exports = function layer1(options) {
    var members = {
        getToken,
        signout,
        signin,
        signup,
        requestPasswordReset,
        resetPassword,
        verifyEmail,
        bus: new events()
    };

    var loadGateway = loadFrame(options.gatewayUrl, options.container).then(function (frame) {
        var gateway = layer0(frame);
        var init = gatewayFn('init');
        gateway.listen(function (data) {
            members.bus.emit(data.event, data.payload);
        });
        return init(gateway).then(function () {
            return gateway;
        })
    });

    function getToken({audience}) {
        return loadGateway.then(gatewayFn('getToken', {audience}));
    }

    function signout() {
        return loadGateway.then(gatewayFn('signout'));
    }

    function signin({email, password}) {
        return loadGateway.then(gatewayFn('signin', {email, password}));
    }

    function signup({name, email, password}) {
        return loadGateway.then(gatewayFn('signin', {name, email, password}));
    }

    function requestPasswordReset({email}) {
        return loadGateway.then(gatewayFn('request-password-reset', {email}));
    }

    function resetPassword({token, password}) {
        return loadGateway.then(gatewayFn('reset-password', {token, password}));
    }

    function verifyEmail({token}) {
        return loadGateway.then(gatewayFn('verify-email', {token}));
    }

    return members;
}

function gatewayFn(method, opts = {}) {
    return function (gateway) {
        return new Promise(function (resolve, reject) {
            gateway.call(method, opts, function (err, res) {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
    }
}

function loadFrame(src, container = document.body) {
    return new Promise(function (resolve) {
        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.src = src;
        frame.onload = function () {
            resolve(frame);
        };
        container.appendChild(frame);
    });
}
