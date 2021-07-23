const errors = require('@tryghost/errors');
const config = require('../../shared/config');
const db = require('../data/db');
const LimitService = require('@tryghost/limit-service');
let limitService = new LimitService();

/**
 * @param {Object} [limits] - An object containing limit configuration
**/
const initFn = (limits = {}) => {
    let helpLink;

    if (config.get('hostSettings:billing:enabled') && config.get('hostSettings:billing:enabled') === true && config.get('hostSettings:billing:url')) {
        helpLink = config.get('hostSettings:billing:url');
    } else {
        helpLink = 'https://ghost.org/help/';
    }

    let subscription;

    if (config.get('hostSettings:subscription')) {
        subscription = {
            startDate: config.get('hostSettings:subscription:start'),
            interval: 'month'
        };
    }

    const hostLimits = config.get('hostSettings:limits') || {};

    limitService.loadLimits({
        limits: Object.assign(hostLimits, limits),
        subscription,
        db,
        helpLink,
        errors
    });
};

module.exports = limitService;

module.exports.init = initFn;
