const createDeterministicApi = require('./createDeterministicApi');

const isNotDeleted = x => !x.deleted;
const getCustomerAttr = ({email}) => ({email});
const getCustomerHashSeed = member => member.email;

module.exports = createDeterministicApi(
    'customers',
    isNotDeleted,
    getCustomerAttr,
    getCustomerHashSeed
);
