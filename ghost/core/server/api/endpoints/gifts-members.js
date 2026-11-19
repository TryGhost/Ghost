const gift = require('../../services/gifts');

/** @type {import('@tryghost/api-framework').Controller} */
module.exports = {
  docName: 'gifts',

  getRedeemable: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['token'],
    validation: {
      data: {
        token: {
          type: 'string',
          required: true,
        },
      },
    },
    permissions: false,
    query(frame) {
      return gift.controller.getRedeemable(frame);
    },
  },

  redeem: {
    statusCode: 200,
    headers: {
      cacheInvalidate: false,
    },
    // The token is read from the URL as an option. The framework only copies URL params into
    // `frame.data` when the request body is empty, and this request can have a body (`answers`).
    options: ['token'],
    validation: {
      options: {
        token: {
          required: true,
        },
      },
    },
    permissions: false,
    query(frame) {
      return gift.controller.redeem(frame);
    },
  },
};
