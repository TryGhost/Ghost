const oembed = require('../../services/oembed');

module.exports = {
    docName: 'oembed',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        data: [
            'url',
            'type'
        ],
        options: [],
        query({data}) {
            let {url, type} = data;

            return oembed.fetchOembedDataFromUrl(url, type);
        }
    }
};
