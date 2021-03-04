const config = require('../../shared/config');
const db = require('../data/db');
const LimitService = require('@tryghost/limit-service');
let limitService = new LimitService();

const initFn = () => {
    let helpLink;

    if (!config.get('hostSettings') || !config.get('hostSettings:limits')) {
        return;
    }

    if (config.get('hostSettings:billing:enabled') && config.get('hostSettings:billing:enabled') === true && config.get('hostSettings:billing:url')) {
        helpLink = config.get('hostSettings:billing:url');
    } else {
        helpLink = 'https://ghost.org/help/';
    }

    limitService.loadLimits({limits: config.get('hostSettings:limits'), db, helpLink});
};

module.exports = limitService;

module.exports.init = initFn;
