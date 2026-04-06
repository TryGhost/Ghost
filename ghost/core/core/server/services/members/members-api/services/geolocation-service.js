const got = require('got').default;
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

module.exports = class GeolocationService {
    async getGeolocationFromIP(ipAddress) {
        if (!ipAddress || (!IPV4_REGEX.test(ipAddress) && !IPV6_REGEX.test(ipAddress))) {
            return;
        }

        const gotOpts = {
            timeout: {
                request: 500
            }
        };

        if (process.env.NODE_ENV?.startsWith('test')) {
            gotOpts.retry = {
                limit: 0
            };
        }

        const geojsUrl = `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ipAddress)}.json`;
        const response = await got(geojsUrl, gotOpts).json();
        return response;
    }
};
