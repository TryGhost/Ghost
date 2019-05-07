const crypto = require('crypto');
const cookie = require('cookie');

const MAX_AGE = 60 * 60 * 24 * 184;

module.exports = function cookies(sessionSecret) {
    function encodeCookie(data) {
        const encodedData = encodeURIComponent(data);
        const hmac = crypto.createHmac('sha256', sessionSecret);
        hmac.update(encodedData);
        return `${hmac.digest('hex')}~${encodedData}`;
    }

    function decodeCookie(data) {
        const hmac = crypto.createHmac('sha256', sessionSecret);
        const [sentHmac, sentData] = data.split('~');
        if (hmac.update(sentData).digest('hex') !== sentHmac) {
            return null;
        }
        return decodeURIComponent(sentData);
    }

    function setCookie(member) {
        return cookie.serialize('signedin', member.id, {
            maxAge: MAX_AGE,
            path: '/ghost/api/v2/members',
            httpOnly: true,
            encode: encodeCookie
        });
    }

    function removeCookie() {
        return cookie.serialize('signedin', false, {
            maxAge: 0,
            path: '/ghost/api/v2/members',
            httpOnly: true
        });
    }

    function getCookie(req) {
        return cookie.parse(req.headers.cookie || '', {
            decode: decodeCookie
        });
    }

    return {
        setCookie,
        removeCookie,
        getCookie
    };
};
