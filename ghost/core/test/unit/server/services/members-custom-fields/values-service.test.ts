import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {CustomFieldValuesService} from '../../../../../core/server/services/members-custom-fields/values-service';

// `namesValues` answers from the input alone, so it needs neither a database nor a
// real ceiling to be exercised.
const service = () => new CustomFieldValuesService({
    knex: {} as never,
    getMaxDefinitions: () => 100
});

describe('CustomFieldValuesService', function () {
    describe('namesValues', function () {
        it('answers no for a body that carries no values', function () {
            // An absent key is not a malformed one: a request that says nothing about
            // custom fields is asking for nothing, not asking for something invalid.
            assert.equal(service().namesValues(undefined), false);
            assert.equal(service().namesValues({}), false);
        });

        it('answers yes for a body that names a value', function () {
            assert.equal(service().namesValues({'favourite-topic': 'Ghosts'}), true);
        });

        it('rejects a body that is present but is not a values object', function () {
            for (const malformed of [null, 'not-an-object', 42, true, [], ['a']]) {
                assert.throws(
                    () => service().namesValues(malformed),
                    (error: {errorType?: string, property?: string}) => {
                        assert.equal(error.errorType, 'ValidationError');
                        assert.equal(error.property, 'custom_fields');
                        return true;
                    },
                    `expected ${JSON.stringify(malformed)} to be rejected`
                );
            }
        });
    });
});
