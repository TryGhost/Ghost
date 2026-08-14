import {InMemoryStore} from './helpers/in-memory-store';
import {runStoreContract} from './helpers/store-contract';

describe('UNIT: InMemoryStore (validates the contract)', function () {
    runStoreContract({
        createStore: () => new InMemoryStore()
    });
});
