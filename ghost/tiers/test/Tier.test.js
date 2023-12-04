const assert = require('assert/strict');
const ObjectID = require('bson-objectid');
const Tier = require('../lib/Tier');
const TierActivatedEvent = require('../lib/TierActivatedEvent');
const TierArchivedEvent = require('../lib/TierArchivedEvent');
const TierNameChangeEvent = require('../lib/TierNameChangeEvent');
const TierPriceChangeEvent = require('../lib/TierPriceChangeEvent');

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
    welcomePageURL: null,
    status: 'active',
    visibility: 'public',
    type: 'paid',
    trialDays: 10,
    currency: 'usd',
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    benefits: []
};

const invalidInputs = [
    {id: [100]},
    {name: 100},
    {name: ('a').repeat(200)},
    {slug: ('slug').repeat(50)},
    {description: ['whatever?']},
    {description: ('b').repeat(200)},
    {welcomePageURL: {cool: 'beans'}},
    {status: 'something random'},
    {visibility: 'highly visible'},
    {type: 'comped'},
    {trialDays: -10},
    {trialDays: 10, type: 'free', currency: null, monthlyPrice: null, yearlyPrice: null},
    {currency: 'dollar bills'},
    {currency: 25},
    {currency: 'USD', type: 'free'},
    {monthlyPrice: 2000, type: 'free', trialDays: null, currency: null, yearlyPrice: null},
    {monthlyPrice: -20},
    {monthlyPrice: 10000000000},
    {yearlyPrice: 2000, type: 'free', trialDays: null, monthlyPrice: null, currency: null},
    {yearlyPrice: -20},
    {yearlyPrice: 10000000000},
    {createdAt: 'Today'},
    {updatedAt: 'Tomorrow'}
];

const validInputs = [
    {welcomePageURL: 'https://google.com'},
    {id: (new ObjectID()).toHexString()},
    {id: new ObjectID()},
    {type: 'free', currency: null, monthlyPrice: null, yearlyPrice: null, trialDays: null},
    {createdAt: new Date()},
    {updatedAt: new Date()},
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
                    await Tier.create(input);
                });
            }
        });

        it('Uses default monthly and yearly price if they are set to 0', async function () {
            const tier = await Tier.create({
                ...validInput,
                monthlyPrice: 0,
                yearlyPrice: 0
            });

            assert.equal(tier.getPrice('month'), 500);
            assert.equal(tier.getPrice('year'), 5000);
        });

        it('Does not error for valid inputs', async function () {
            for (const validInputItem of validInputs) {
                let input = {};
                Object.assign(input, validInput, validInputItem);
                await Tier.create(input);
            }
        });

        it('Can create a Tier with valid input', async function () {
            const tier = await Tier.create(validInput);

            const expectedProps = [
                'slug',
                'name',
                'description',
                'welcomePageURL',
                'status',
                'visibility',
                'type',
                'trialDays',
                'currency',
                'monthlyPrice',
                'yearlyPrice',
                'createdAt',
                'updatedAt',
                'benefits'
            ];

            for (const prop of expectedProps) {
                assert(tier[prop] === tier.toJSON()[prop]);
            }
            assert(tier.id.toHexString() === tier.toJSON().id);
        });

        it('Errors when attempting to set invalid properties', async function () {
            const tier = await Tier.create(validInput);

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
                tier.welcomePageURL = 20;
            });

            assertError(() => {
                tier.status = 20;
            });

            assertError(() => {
                tier.visibility = 20;
            });

            assertError(() => {
                tier.trialDays = 'one hundred';
            });

            assertError(() => {
                tier.currency = 'one hundred';
            });

            assertError(() => {
                tier.monthlyPrice = 'one hundred';
            });

            assertError(() => {
                tier.yearlyPrice = 'one hundred';
            });
        });

        it('Can change name and adds an event', async function () {
            const tier = await Tier.create(validInput);

            tier.name = 'New name';

            assert(tier.events.find((event) => {
                return event instanceof TierNameChangeEvent;
            }));
        });

        it('Can update pricing information and adds an event', async function () {
            const tier = await Tier.create(validInput);

            tier.updatePricing({
                currency: 'eur',
                monthlyPrice: 1000,
                yearlyPrice: 6000
            });

            assert(tier.currency === 'EUR');
            assert(tier.monthlyPrice === 1000);
            assert(tier.yearlyPrice === 6000);
            assert(tier.events.find((event) => {
                return event instanceof TierPriceChangeEvent;
            }));
        });

        it('Can archive tier and adds an event', async function () {
            const tier = await Tier.create(validInput);

            tier.status = 'archived';
            assert(tier.events.find((event) => {
                return event instanceof TierArchivedEvent;
            }));
        });

        it('Can activate tier and adds an event', async function () {
            const tier = await Tier.create({...validInput, status: 'archived'});

            tier.status = 'active';
            assert(tier.events.find((event) => {
                return event instanceof TierActivatedEvent;
            }));
        });

        it('Does not add event if values not changed', async function () {
            const tier = await Tier.create(validInput);

            tier.status = 'active';
            assert(!tier.events.find((event) => {
                return event instanceof TierActivatedEvent;
            }));

            tier.name = 'Tier Name';
            assert(!tier.events.find((event) => {
                return event instanceof TierNameChangeEvent;
            }));

            tier.updatePricing({
                currency: tier.currency,
                monthlyPrice: tier.monthlyPrice,
                yearlyPrice: tier.yearlyPrice
            });
            assert(!tier.events.find((event) => {
                return event instanceof TierPriceChangeEvent;
            }));
        });

        it('Cannot set pricing data on a free tier', async function () {
            const tier = await Tier.create({
                ...validInput,
                type: 'free',
                currency: null,
                monthlyPrice: null,
                yearlyPrice: null,
                trialDays: null
            });

            assertError(() => {
                tier.updatePricing({
                    currency: 'usd',
                    monthlyPrice: 1000,
                    yearlyPrice: 10000
                });
            });
        });

        it('Can set the description of a Tier', async function () {
            const tier = await Tier.create(validInput);

            tier.description = 'Updated description';

            assert.equal('Updated description', tier.description);
        });
    });
});
