const errors = require('@tryghost/errors');
const config = require('../../shared/config');
const db = require('../data/db');
const LimitService = require('@tryghost/limit-service');
let limitService = new LimitService();

const initFn = (limits) => {
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

    limitService.loadLimits({
        limits: Object.assign(config.get('hostSettings:limits'), limits),
        subscription,
        db,
        helpLink,
        errors
    });
};

module.exports = limitService;

module.exports.init = initFn;
