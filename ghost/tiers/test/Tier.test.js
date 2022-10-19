const assert = require('assert');
const ObjectID = require('bson-objectid');
const Tier = require('../lib/Tier');

async function assertError(fn, checkError) {
    let error;
    try {
        await fn();
        error = false;
    } catch (err) {
        error = err;
    } finally {
        assert(error);
        if (checkError) {
            checkError(error);
        }
    }
}
const validInput = {
    name: 'Tier Name',
    slug: 'tier-name',
    description: 'My First Tier',
    welcome_page_url: null,
    status: 'active',
    visibility: 'public',
    type: 'paid',
    trial_days: 10,
    currency: 'usd',
    monthly_price: 5000,
    yearly_price: 50000,
    benefits: []
};

const invalidInputs = [
    {id: [100]},
    {name: 100},
    {name: ('a').repeat(200)},
    {description: ['whatever?']},
    {description: ('b').repeat(200)},
    {welcome_page_url: 'hello world'},
    {status: 'something random'},
    {visibility: 'highly visible'},
    {type: 'comped'},
    {trial_days: -10},
    {trial_days: 10, type: 'free', currency: null, monthly_price: null, yearly_price: null},
    {currency: 'dollar bills'},
    {currency: 25},
    {currency: 'USD', type: 'free'},
    {monthly_price: 2000, type: 'free', trial_days: null, currency: null, yearly_price: null},
    {monthly_price: null},
    {monthly_price: -20},
    {monthly_price: 10000000000},
    {yearly_price: 2000, type: 'free', trial_days: null, monthly_price: null, currency: null},
    {yearly_price: null},
    {yearly_price: -20},
    {yearly_price: 10000000000},
    {created_at: 'Today'},
    {updated_at: 'Tomorrow'}
];

const validInputs = [
    {welcome_page_url: new URL('https://google.com')},
    {id: (new ObjectID()).toHexString()},
    {id: new ObjectID()},
    {type: 'free', currency: null, monthly_price: null, yearly_price: null, trial_days: null},
    {created_at: new Date()},
    {updated_at: new Date()},
    {status: undefined},
    {type: undefined},
    {visibility: undefined}
];

describe('Tier', function () {
    describe('create', function () {
        it('Errors if passed an invalid input', async function () {
            for (const invalidInput of invalidInputs) {
                let input = {};
                Object.assign(input, validInput, invalidInput);
                await assertError(async function () {
                    await Tier.create(input, {validate: x => x, generate: x => x});
                });
            }
        });

        it('Does not error for valid inputs', async function () {
            for (const validInputItem of validInputs) {
                let input = {};
                Object.assign(input, validInput, validInputItem);
                await Tier.create(input, {validate: x => x, generate: x => x});
            }
        });

        it('Can create a Tier with valid input', async function () {
            const tier = await Tier.create(validInput, {validate: x => x, generate: x => x});

            const expectedProps = [
                'id',
                'slug',
                'name',
                'description',
                'welcome_page_url',
                'status',
                'visibility',
                'type',
                'trial_days',
                'currency',
                'monthly_price',
                'yearly_price',
                'created_at',
                'updated_at',
                'benefits'
            ];

            for (const prop of expectedProps) {
                assert(tier[prop] === tier.toJSON()[prop]);
            }
        });

        it('Errors when attempting to set invalid properties', async function () {
            const tier = await Tier.create(validInput, {validate: x => x, generate: x => x});

            assertError(() => {
                tier.name = 20;
            });

            assertError(() => {
                tier.benefits = 20;
            });

            assertError(() => {
                tier.description = 20;
            });

            assertError(() => {
                tier.welcome_page_url = 20;
            });

            assertError(() => {
                tier.status = 20;
            });

            assertError(() => {
                tier.visibility = 20;
            });

            assertError(() => {
                tier.trial_days = 'one hundred';
            });

            assertError(() => {
                tier.currency = 'one hundred';
            });

            assertError(() => {
                tier.monthly_price = 'one hundred';
            });

            assertError(() => {
                tier.yearly_price = 'one hundred';
            });
        });
    });
});
