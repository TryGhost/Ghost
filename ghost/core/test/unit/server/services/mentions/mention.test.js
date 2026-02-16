const assert = require('node:assert/strict');
const ObjectID = require('bson-objectid').default;
const cheerio = require('cheerio');
const sinon = require('sinon');

const Mention = require('../../../../../core/server/services/mentions/mention');

const validInput = {
    source: 'https://source.com',
    target: 'https://target.com',
    sourceTitle: 'Title!',
    sourceExcerpt: 'Excerpt!'
};

describe('Mention', function () {
    describe('toJSON', function () {
        it('Returns a object with the expected properties', async function () {
            const mention = await Mention.create(validInput);
            const actual = Object.keys(mention.toJSON());
            const expected = [
                'id',
                'source',
                'target',
                'timestamp',
                'payload',
                'resourceId',
                'resourceType',
                'sourceTitle',
                'sourceSiteTitle',
                'sourceAuthor',
                'sourceExcerpt',
                'sourceFavicon',
                'sourceFeaturedImage',
                'verified'
            ];
            assert.deepEqual(actual, expected);
        });
    });

    describe('verify', function () {
        afterEach(function () {
            sinon.restore();
        });

        it('can handle invalid HTML', async function () {
            const mention = await Mention.create(validInput);
            assert(!mention.verified);

            sinon.stub(cheerio, 'load').throws(new Error('Invalid HTML'));

            mention.verify('irrelevant', 'text/html');
            assert(!mention.verified);
            assert(!mention.isDeleted());
        });

        it('Does basic check for the target URL and updates verified property', async function () {
            const mention = await Mention.create(validInput);
            assert(!mention.verified);

            mention.verify('<a href="https://target.com/">', 'text/html');
            assert(mention.verified);
            assert(!mention.isDeleted());

            mention.verify('something else', 'text/html');
            assert(mention.verified);
            assert(mention.isDeleted());
        });
        it('detects differences', async function () {
            const mention = await Mention.create(validInput);
            assert(!mention.verified);

            mention.verify('<a href="https://not-target.com/">', 'text/html');
            assert(!mention.verified);
            assert(!mention.isDeleted());
        });
        it('Does check for Image targets', async function () {
            const mention = await Mention.create({
                ...validInput,
                target: 'https://target.com/image.jpg'
            });
            assert(!mention.verified);

            mention.verify('<img src="https://target.com/image.jpg">', 'text/html');
            assert(mention.verified);
            assert(!mention.isDeleted());

            mention.verify('something else', 'text/html');
            assert(mention.verified);
            assert(mention.isDeleted());
        });
        it('Does check for Video targets', async function () {
            const mention = await Mention.create({
                ...validInput,
                target: 'https://target.com/video.mp4'
            });
            assert(!mention.verified);

            mention.verify('<video src="https://target.com/video.mp4">', 'text/html');
            assert(mention.verified);
            assert(!mention.isDeleted());

            mention.verify('something else', 'text/html');
            assert(mention.verified);
            assert(mention.isDeleted());
        });

        it('can verify links in JSON', async function () {
            const mention = await Mention.create(validInput);
            assert(!mention.verified);

            mention.verify('{"url": "https://target.com/"}', 'application/json');
            assert(mention.verified);
            assert(!mention.isDeleted());

            mention.verify('{}', 'application/json');
            assert(mention.verified);
            assert(mention.isDeleted());
        });

        it('can handle invalid JSON', async function () {
            const mention = await Mention.create(validInput);
            assert(!mention.verified);

            mention.verify('{"url": "ht', 'application/json');
            assert(!mention.verified);
            assert(!mention.isDeleted());
        });
    });

    describe('undelete', function () {
        afterEach(function () {
            sinon.restore();
        });

        it('can undelete a verified mention', async function () {
            const mention = await Mention.create({
                ...validInput,
                id: new ObjectID(),
                deleted: true,
                verified: true
            });
            assert(mention.verified);
            assert(mention.deleted);

            mention.verify('{"url": "https://target.com/"}', 'application/json');
            assert(mention.verified);
            assert(!mention.isDeleted());
        });
    });

    describe('create', function () {
        it('Will error with invalid inputs', async function () {
            const invalidInputs = [
                {id: 'Not valid ID'},
                {id: 123},
                {source: 'Not a valid source'},
                {target: 'Not a valid target'},
                {timestamp: 'Not a valid timestamp'},
                {resourceId: 'Invalid resourceId'},
                {sourceTitle: 123},
                {sourceExcerpt: 123},
                {sourceFavicon: 'Invalid source favicon'},
                {sourceFeaturedImage: 'Invalid source featured image'}
            ];

            for (const invalidInput of invalidInputs) {
                let errored = false;
                try {
                    await Mention.create({
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
                {source: new URL('https://source.com/')},
                {target: new URL('https://target.com/')},
                {timestamp: new Date()},
                {timestamp: '2023-01-01T00:00:00Z'},
                {payload: {extra: 'shit'}},
                {resourceId: new ObjectID()},
                {sourceFavicon: 'https://source.com/favicon.ico'},
                {sourceFavicon: new URL('https://source.com/favicon.ico')},
                {sourceFeaturedImage: 'https://source.com/assets/image.jpg'},
                {sourceFeaturedImage: new URL('https://source.com/assets/image.jpg')}
            ];

            for (const localValidInput of validInputs) {
                await Mention.create({
                    ...validInput,
                    ...localValidInput
                });
            }
        });

        it('Will trim titles which are too long', async function () {
            const mention = await Mention.create({
                ...validInput,
                sourceTitle: Array.from({length: 3000}).join('A')
            });

            assert(mention.sourceTitle.length === 2000);
        });

        it('Will default the title to the host of the source URL if missing', async function () {
            const mention = await Mention.create({
                ...validInput,
                sourceTitle: null
            });

            assert(mention.sourceTitle);
            assert(mention.sourceTitle === 'source.com');
        });
    });
});
