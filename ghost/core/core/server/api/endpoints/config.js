const publicConfig = require('../../services/public-config');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'config',

  read: {
    integrationTokens: true,
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
