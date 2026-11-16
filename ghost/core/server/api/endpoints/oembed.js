const oembed = require('../../../../domains/publishing/transition/services/oembed').default;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'oembed',

  read: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: false,
    data: ['url', 'type'],
    options: [],
    query({ data }) {
      const { url, type } = data;

      return oembed.service.fetchOembedDataFromUrl(url, type);
    },
  },
};

module.exports = controller;
