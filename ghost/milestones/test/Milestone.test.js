const assert = require('assert/strict');
const ObjectID = require('bson-objectid');
const Milestone = require('../lib/Milestone');

const validInputARR = {
    type: 'arr',
    value: 100
};

const validInputMembers = {
    type: 'members',
    value: 300
};

describe('Milestone', function () {
    describe('toJSON', function () {
        it('Returns an object with the expected properties', async function () {
            const milestone = await Milestone.create(validInputARR);
            const actual = Object.keys(milestone.toJSON());
            const expected = [
                'id',
                'name',
                'type',
                'value',
                'currency',
                'createdAt',
                'emailSentAt'
            ];
            assert.deepEqual(actual, expected);
        });
    });

    describe('create', function () {
        it('Will error with invalid inputs', async function () {
            const invalidInputs = [
                {id: 'Invalid ID provided for Milestone'},
                {id: 124},
                {value: undefined},
                {value: 'Invalid Value'},
                {createdAt: 'Invalid Date'},
                {emailSentAt: 'Invalid Date'}
            ];

            for (const invalidInput of invalidInputs) {
                let errored = false;
                try {
                    await Milestone.create({
                        ...validInputARR,
                        ...invalidInput
                    });
                    await Milestone.create({
                        ...validInputMembers,
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
                {id: new ObjectID().toString()},
                {id: null},
                {value: 0},
                {value: 25000},
                {type: 'something'},
                {name: 'testing'},
                {name: 'members-10000000'},
                {createdAt: new Date()},
                {createdAt: '2023-01-01T00:00:00Z'},
                {emailSentAt: new Date()},
                {emailSentAt: '2023-01-01T00:00:00Z'},
                {emailSentAt: null},
                {currency: 'usd'},
                {currency: null},
                {currency: 1234},
                {currency: 'not-a-currency'}
            ];

            for (const localValidInput of validInputs) {
                await Milestone.create({
                    ...validInputARR,
                    ...localValidInput
                });
                await Milestone.create({
                    ...validInputMembers,
                    ...localValidInput
                });
            }
        });

        it('Will generate a valid name for ARR milestone', async function () {
            const milestone = await Milestone.create({
                ...validInputARR,
                value: 0,
                type: 'arr',
                currency: 'aud'
            });

            assert(milestone.name === 'arr-0-aud');
        });

        it('Will generate a valid name for Members milestone', async function () {
            const milestone = await Milestone.create({
                ...validInputMembers,
                value: 100,
                type: 'members'
            });

            assert(milestone.name === 'members-100');
        });

        it('Will create event for new milestone but not for existing one', async function () {
            const milestoneOne = await Milestone.create({
                ...validInputMembers,
                value: 500,
                type: 'members'
            });

            assert(milestoneOne.events.length >= 1);

            // simulate creating an existing milestone
            const id = new ObjectID();
            const milestoneTwo = await Milestone.create({
                ...validInputMembers,
                id,
                value: 500,
                type: 'members'
            });

            assert(milestoneTwo.events.length === 0);
        });
    });
});
