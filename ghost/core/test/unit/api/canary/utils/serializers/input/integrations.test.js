const assert = require('node:assert/strict');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/input/pages', function () {
    describe('browse', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {}
                }
            };

            serializers.input.integrations.browse(apiConfig, frame);
            assert.equal(frame.options.filter, 'type:[custom,builtin,core]');
        });

        it('combines filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'type:internal',
                    context: {}
                }
            };

            serializers.input.integrations.browse(apiConfig, frame);
            assert.equal(frame.options.filter, '(type:internal)+type:[custom,builtin,core]');
        });
    });

    describe('read', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {}
                }
            };

            serializers.input.integrations.read(apiConfig, frame);
            assert.equal(frame.options.filter, 'type:[custom,builtin,core]');
        });

        it('combines filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'type:internal',
                    context: {}
                }
            };

            serializers.input.integrations.read(apiConfig, frame);
            assert.equal(frame.options.filter, '(type:internal)+type:[custom,builtin,core]');
        });
    });
});