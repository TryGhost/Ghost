const config = require('../../../shared/config');
const externalRequest = require('../../lib/request-external');
const {i18n} = require('../../lib/common');
const OEmbed = require('../../services/oembed');
const oembed = new OEmbed({config, externalRequest, i18n});

module.exports = {
    docName: 'oembed',

    read: {
        permissions: false,
        data: [
            'url',
            'type'
        ],
        options: [],
        query({data}) {
            let {url, type} = data;

            if (type === 'bookmark') {
                return oembed.fetchBookmarkData(url)
                    .catch(oembed.errorHandler(url));
            }

            return oembed.fetchOembedData(url).then((response) => {
                if (!response && !type) {
                    return oembed.fetchBookmarkData(url);
                }
                return response;
            }).then((response) => {
                if (!response) {
                    return oembed.unknownProvider(url);
                }
                return response;
            }).catch(oembed.errorHandler(url));
        }
    }
};
