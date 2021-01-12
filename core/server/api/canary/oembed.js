const {fetchBookmarkData, fetchOembedData, errorHandler, unknownProvider} = require('../../services/oembed');

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
                return fetchBookmarkData(url)
                    .catch(errorHandler(url));
            }

            return fetchOembedData(url).then((response) => {
                if (!response && !type) {
                    return fetchBookmarkData(url);
                }
                return response;
            }).then((response) => {
                if (!response) {
                    return unknownProvider(url);
                }
                return response;
            }).catch(errorHandler(url));
        }
    }
};
