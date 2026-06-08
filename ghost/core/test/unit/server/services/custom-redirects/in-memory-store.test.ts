/* eslint-disable ghost/mocha/no-setup-in-describe -- runStoreContract is the parameterised-test seam; calling it inside describe is the intended use. */
import {InMemoryStore} from './helpers/in-memory-store';
import {runStoreContract} from './helpers/store-contract';

describe('UNIT: InMemoryStore (validates the contract)', function () {
    runStoreContract({
        createStore: () => new InMemoryStore()
    });
});
