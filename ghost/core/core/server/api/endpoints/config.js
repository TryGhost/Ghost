const publicConfig = require('./utils/public-config');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'config',

  read: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: false,
    query() {
      return publicConfig.config;
    },
  },
};

module.exports = controller;
