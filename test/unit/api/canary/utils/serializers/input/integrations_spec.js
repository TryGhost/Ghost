const should = require('should');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');

describe('Unit: canary/utils/serializers/input/pages', function () {
    describe('browse', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {}
                }
            };

            serializers.input.integrations.browse(apiConfig, frame);
            frame.options.filter.should.eql('type:[custom,builtin]');
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
            frame.options.filter.should.eql('(type:internal)+type:[custom,builtin]');
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
            frame.options.filter.should.eql('type:[custom,builtin]');
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
            frame.options.filter.should.eql('(type:internal)+type:[custom,builtin]');
        });
    });
});
