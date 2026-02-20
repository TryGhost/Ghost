const assert = require('node:assert/strict');
const shared = require('../../../');

describe('serializers/input/all', function () {
    describe('all', function () {
        it('transforms into model readable format', function () {
            const apiConfig = {};
            const frame = {
                original: {
                    include: 'tags',
                    fields: 'id,status',
                    formats: 'html'
                },
                options: {
                    include: 'tags',
                    fields: 'id,status',
                    formats: 'html',
                    context: {}
                }
            };

            shared.serializers.input.all.all(apiConfig, frame);

            assert.ok(frame.original.include);
            assert.ok(frame.original.fields);
            assert.ok(frame.original.formats);

            assert.equal(frame.options.include, undefined);
            assert.equal(frame.options.fields, undefined);
            assert.ok(frame.options.formats);
            assert.ok(frame.options.columns);
            assert.ok(frame.options.withRelated);

            assert.deepEqual(frame.options.withRelated, ['tags']);
            assert.deepEqual(frame.options.columns, ['id', 'status', 'html']);
            assert.deepEqual(frame.options.formats, ['html']);
        });

        describe('extra allowed internal options', function () {
            it('internal access', function () {
                const frame = {
                    options: {
                        context: {
                            internal: true
                        },
                        transacting: true,
                        forUpdate: true
                    }
                };

                const apiConfig = {};

                shared.serializers.input.all.all(apiConfig, frame);

                assert.ok(frame.options.transacting);
                assert.ok(frame.options.forUpdate);
                assert.ok(frame.options.context);
            });

            it('no internal access', function () {
                const frame = {
                    options: {
                        context: {
                            user: true
                        },
                        transacting: true,
                        forUpdate: true
                    }
                };

                const apiConfig = {};

                shared.serializers.input.all.all(apiConfig, frame);

                assert.equal(frame.options.transacting, undefined);
                assert.equal(frame.options.forUpdate, undefined);
                assert.ok(frame.options.context);
            });
        });
    });
});
