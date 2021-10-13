const debug = require('@tryghost/debug')('card-assets');
const themeEngine = require('../theme-engine');

const CardAssetService = require('./service');
let cardAssetService = new CardAssetService();

const initFn = async () => {
    const cardAssetConfig = themeEngine.getActive().config('card_assets');
    debug('initialising with config', cardAssetConfig);

    await cardAssetService.load(cardAssetConfig);
};

module.exports = cardAssetService;

module.exports.init = initFn;
