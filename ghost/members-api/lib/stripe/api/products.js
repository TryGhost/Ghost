const createDeterministicApi = require('./createDeterministicApi');

const isActive = x => x.active;
const getProductAttr = ({name}) => ({name, type: 'service'});
const getProductHashSeed = () => 'Ghost Subscription';

module.exports = createDeterministicApi(
    'products',
    isActive,
    getProductAttr,
    getProductHashSeed
);
