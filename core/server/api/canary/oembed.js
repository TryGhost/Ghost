const config = require('../../../shared/config');
const externalRequest = require('../../lib/request-external');
const tpl = require('@tryghost/tpl');
const OEmbed = require('../../services/oembed');
const oembed = new OEmbed({config, externalRequest, tpl});

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

            return oembed.fetchOembedDataFromUrl(url, type);
        }
    }
};
