const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

describe('Unit: v2/utils/serializers/input/pages', function () {
    describe('browse', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {}
                },
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('page:true');
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'status:published+tag:eins',
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('(status:published+tag:eins)+page:true');
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'page:false+tag:eins',
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('(page:false+tag:eins)+page:true');
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'page:false',
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('(page:false)+page:true');
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    formats: ['html', 'mobiledoc', 'plaintext'],
                    context: {}
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });

    describe('read', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {}
                },
                data: {
                    status: 'all'
                }
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.data.status.should.eql('all');
            frame.data.page.should.eql(true);
        });

        it('overrides page', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {}
                },
                data: {
                    status: 'all',
                    page: false
                }
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.data.status.should.eql('all');
            frame.data.page.should.eql(true);
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    formats: ['html', 'mobiledoc', 'plaintext'],
                    context: {}
                },
                data: {
                    status: 'all',
                    page: false
                }
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });
});
