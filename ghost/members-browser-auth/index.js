/* global document window */
var gatewayApi = require('@tryghost/members-gateway-api');

module.exports = function layer2(options) {
    var authUrl = `${options.membersUrl}/auth`;
    var gatewayUrl = `${options.membersUrl}/gateway`;
    var container = options.container;

    var members = gatewayApi({
        gatewayUrl,
        container
    });

    var loadAuth = loadFrame(authUrl, container).then(function (frame) {
        frame.style.position = 'fixed';
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.background = 'transparent';
        frame.style.top = '0';
        frame.style['z-index'] = '9999';
        return frame;
    });

    function openAuth(hash, query = '') {
        return loadAuth.then(function (frame) {
            return new Promise(function (resolve) {
                frame.src = `${authUrl}#${hash}?${query}`;
                frame.style.display = 'block';
                window.addEventListener('message', function messageListener(event) {
                    if (event.source !== frame.contentWindow) {
                        return;
                    }
                    if (!event.data || event.data.msg !== 'pls-close-auth-popup') {
                        return;
                    }
                    window.removeEventListener('message', messageListener);
                    frame.style.display = 'none';
                    resolve(!!event.data.success);
                });
            });
        });
    }

    function resetPassword({token}) {
        const query = `token=${token}`;
        return openAuth('reset-password', query);
    }

    function signin() {
        return openAuth('signin');
    }

    function upgrade() {
        return openAuth('upgrade');
    }

    function signup({coupon} = {}) {
        const query = `coupon=${coupon}`;
        return openAuth('signup', query);
    }

    function getToken({audience, fresh}) {
        return members.getToken({audience, fresh});
    }

    function getSSRToken({fresh} = {}) {
        return members.getConfig().then(function ({issuer}) {
            return members.getToken({audience: issuer, fresh});
        });
    }

    function signout() {
        return members.signout();
    }

    return Object.assign(members.bus, {
        getToken,
        getSSRToken,
        signout,
        signin,
        signup,
        upgrade,
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
