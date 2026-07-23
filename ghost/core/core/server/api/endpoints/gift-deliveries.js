const domainEvents = require('@tryghost/domain-events');
const StartGiftDeliveryFlushEvent = require('../../services/gifts/events/start-gift-delivery-flush-event');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'gifts',

    flushDeliveries: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'gifts',
            method: 'flushDeliveries'
        },
        query() {
            domainEvents.dispatch(StartGiftDeliveryFlushEvent.create());
        }
    }
};

module.exports = controller;
