const assert = require('node:assert/strict');
const createFacade = require('../../../../core/shared/container/create-facade');
const {resetContainer} = require('../../../../core/shared/container/current');

describe('createFacade', function () {
    afterEach(function () {
        resetContainer();
    });

    it('does not construct the legacy instance for module interop probes', function () {
        let constructed = 0;
        const facade = createFacade('probe', () => {
            constructed += 1;
            return {value: 42};
        });

        // The probes tsx/Node run against exports during require interop
        Object.getOwnPropertyDescriptor(facade, '__esModule');
        Object.getOwnPropertyDescriptor(facade, 'default');
        void facade.__esModule;
        void facade.default;
        void facade.then;
        void facade[Symbol.toStringTag];
        void ('__esModule' in facade);
        Object.getOwnPropertyDescriptor(facade, 'module.exports');

        assert.equal(constructed, 0);

        assert.equal(facade.value, 42);
        assert.equal(constructed, 1);
    });

    it('constructs lazily and memoizes for real property access', function () {
        let constructed = 0;
        const facade = createFacade('probe2', () => {
            constructed += 1;
            return {value: 'hello'};
        });

        assert.equal(facade.value, 'hello');
        assert.equal(facade.value, 'hello');
        assert.equal(constructed, 1);
    });
});
