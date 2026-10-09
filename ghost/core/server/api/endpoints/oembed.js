const oembed = require('../../services/oembed');

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

      return oembed.fetchOembedDataFromUrl(url, type);
    },
  },
};

module.exports = controller;
