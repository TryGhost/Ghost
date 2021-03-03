const config = require('../../shared/config');
const db = require('../data/db');
const LimitService = require('@tryghost/limit-service');
let limitService = new LimitService();

const initFn = () => {
    let helpLink;

    if (!config.get('host_settings') || !config.get('host_settings:limits')) {
        return;
    }

    if (config.get('host_settings:billing:enabled') && config.get('host_settings:billing:enabled') === true && config.get('host_settings:billing:url')) {
        helpLink = config.get('host_settings:billing:url');
    } else {
        helpLink = 'https://ghost.org/help/';
    }

    limitService.loadLimits({limits: config.get('host_settings:limits'), db, helpLink});
};

module.exports = limitService;

module.exports.init = initFn;
