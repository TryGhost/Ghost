/* global document */
var gatewayProtocol = require('@tryghost/members-gateway-protocol');
var events = require('minivents');

module.exports = function layer1(options) {
    var members = {
        getToken,
        getConfig,
        signout,
        signin,
        signup,
        requestPasswordReset,
        resetPassword,
        bus: new events()
    };

    var loadGateway = loadFrame(options.gatewayUrl, options.container).then(function (frame) {
        var gateway = gatewayProtocol(frame);
        var init = gatewayFn('init');
        gateway.listen(function (data) {
            members.bus.emit(data.event, data.payload);
        });
        return init(gateway).then(function () {
            return gateway;
        });
    });

    function getToken({audience, fresh}) {
        return loadGateway.then(gatewayFn('getToken', {audience, fresh}));
    }

    function getConfig() {
        return loadGateway.then(gatewayFn('getConfig'));
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

    return members;
};

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
    };
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
