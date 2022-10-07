const errors = require('@tryghost/errors');
const config = require('../../shared/config');
const db = require('../data/db');
const logging = require('@tryghost/logging');
const LimitService = require('@tryghost/limit-service');
let limitService = new LimitService();

const init = () => {
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

    try {
        limitService.loadLimits({
            limits: hostLimits,
            subscription,
            db,
            helpLink,
            errors
        });
    } catch (error) {
        // Do not block the boot process for an incorrect usage error
        if (error instanceof errors.IncorrectUsageError) {
            logging.warn(error);
        } else {
            throw error;
        }
    }
};

module.exports = limitService;

module.exports.init = init;
