const assert = require('node:assert/strict');

const flagOverrides = require('../../../core/shared/labs-flag-overrides');

describe('Labs flag overrides store', function () {
    afterEach(function () {
        flagOverrides.clear();
    });

    it('starts empty', function () {
        assert.deepEqual(flagOverrides.getAll(), {});
    });

    it('replace sets the active overrides and getAll reflects them', function () {
        flagOverrides.replace({flagA: true, flagB: false});
        assert.deepEqual(flagOverrides.getAll(), {flagA: true, flagB: false});
    });

    it('replace fully swaps the previous set rather than merging', function () {
        flagOverrides.replace({flagA: true});
        flagOverrides.replace({flagB: false});
        assert.deepEqual(flagOverrides.getAll(), {flagB: false});
    });

    it('clear returns to an empty set', function () {
        flagOverrides.replace({flagA: true});
        flagOverrides.clear();
        assert.deepEqual(flagOverrides.getAll(), {});
    });

    it('getAll returns a copy, so mutating it cannot affect stored state', function () {
        flagOverrides.replace({flagA: true});

        const copy = flagOverrides.getAll();
        copy.flagA = false;
        copy.flagB = true;

        assert.deepEqual(flagOverrides.getAll(), {flagA: true});
    });

    it('isolates stored state from later mutation of the caller payload', function () {
        const payload = {flagA: true};
        flagOverrides.replace(payload);
        payload.flagA = false; // mutating the caller's object must not affect stored state

        assert.deepEqual(flagOverrides.getAll(), {flagA: true});
    });

    it('treats a non-object payload as empty without throwing', function () {
        flagOverrides.replace({flagA: true});

        assert.doesNotThrow(() => flagOverrides.replace(null));
        assert.deepEqual(flagOverrides.getAll(), {});

        flagOverrides.replace('nope');
        assert.deepEqual(flagOverrides.getAll(), {});

        flagOverrides.replace(['x']);
        assert.deepEqual(flagOverrides.getAll(), {});

        flagOverrides.replace(42);
        assert.deepEqual(flagOverrides.getAll(), {});

        flagOverrides.replace(undefined);
        assert.deepEqual(flagOverrides.getAll(), {});
    });
});
