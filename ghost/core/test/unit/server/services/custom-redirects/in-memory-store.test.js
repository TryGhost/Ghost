const InMemoryStore = require('./helpers/in-memory-store');
const runStoreContract = require('./helpers/store-contract');

describe('UNIT: InMemoryStore (validates the contract)', function () {
    runStoreContract({
        createStore: () => new InMemoryStore()
    });
});
