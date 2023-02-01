const assert = require('assert');
const ObjectID = require('bson-objectid');
const Milestone = require('../lib/Milestone');

const validInput = {
    type: 'members',
    value: 100
};

describe('Milestone', function () {
    describe('toJSON', function () {
        it('Returns a object with the expected properties', async function () {
            const milestone = await Milestone.create(validInput);
            const actual = Object.keys(milestone.toJSON());
            const expected = [
                'id',
                'name',
                'type',
                'value',
                'createdAt',
                'emailSentAt'
            ];
            assert.deepEqual(actual, expected);
        });
    });

    describe('create', function () {
        it('Will error with invalid inputs', async function () {
            const invalidInputs = [
                {id: 'Not valid ID'},
                {value: 'Invalid Value'},
                {createdAt: 'Invalid Date'},
                {emailSentAt: 'Invalid Date'}
            ];

            for (const invalidInput of invalidInputs) {
                let errored = false;
                try {
                    await Milestone.create({
                        ...validInput,
                        ...invalidInput
                    });
                } catch (err) {
                    errored = true;
                } finally {
                    if (!errored) {
                        assert.fail(`Should have errored with invalid input ${JSON.stringify(invalidInput)}`);
                    }
                }
            }
        });

        it('Will not error with valid inputs', async function () {
            const validInputs = [
                {id: new ObjectID()},
                {id: 123},
                {type: 'something'},
                {name: 'testing'},
                {name: 'members-10000000'},
                {createdAt: new Date()},
                {createdAt: '2023-01-01T00:00:00Z'},
                {emailSentAt: new Date()},
                {emailSentAt: '2023-01-01T00:00:00Z'},
                {emailSentAt: null}
            ];

            for (const localValidInput of validInputs) {
                await Milestone.create({
                    ...validInput,
                    ...localValidInput
                });
            }
        });

        it('Will generate a valid name', async function () {
            const milestone = await Milestone.create({
                ...validInput,
                value: 500,
                type: 'arr'
            });

            assert(milestone.name === 'arr-500');
        });
    });
});
