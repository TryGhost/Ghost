var layer1 = require('@tryghost/members-layer1');

module.exports = function layer2(options) {
    var authUrl = `${options.membersUrl}/auth`;
    var gatewayUrl = `${options.membersUrl}/gateway`;

    var members = layer1({
        gatewayUrl
    });

    var loadAuth = loadFrame(authUrl).then(function (frame) {
        frame.style.position = 'fixed';
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.background = 'transparent';
        frame.style.top = '0';
        frame.style['z-index'] = '9999';
        return frame;
    });

    function closeAuth() {
        return loadAuth.then(function (frame) {
            frame.style.display = 'none';
            return frame;
        });
    }

    function openAuth(hash, query = '') {
        return loadAuth.then(function (frame) {
            frame.src = `${authUrl}#${hash}?${query}`;
            frame.style.display = 'block';
            return frame;
        });
    }

    function resetPassword({token}) {
        const query = `token=${token}`;
        return openAuth('reset-password', query).then(function () {
            return new Promise(function (resolve) {
                members.bus.on('signedin', function self() {
                    members.bus.off('signedin', self);
                    resolve(true);
                });
            });
        });
    }

    function signin() {
        return openAuth('signin').then(function () {
            return new Promise(function (resolve) {
                members.bus.on('signedin', function self() {
                    members.bus.off('signedin', self);
                    resolve(true);
                });
            });
        });
    }

    function getToken({audience}) {
        return members.getToken({audience});
    }

    function signout() {
        return members.signout();
    }

    return Object.assign(members.bus, {
        getToken,
        signout,
        signin,
        resetPassword
    });
};

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
