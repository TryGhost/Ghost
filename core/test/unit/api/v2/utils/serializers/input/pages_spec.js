const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

describe('Unit: v2/utils/serializers/input/pages', function () {
    describe('browse', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {}
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('page:true');
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'status:published+tag:eins'
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('status:published+tag:eins+page:true');
        });

        it('remove existing page filter', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'page:false+tag:eins'
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('tag:eins+page:true');
        });

        it('remove existing page filter', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    filter: 'page:false'
                }
            };

            serializers.input.pages.browse(apiConfig, frame);
            frame.options.filter.should.eql('page:true');
        });
    });

    describe('read', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {},
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
                options: {},
                data: {
                    status: 'all',
                    page: false
                }
            };

            serializers.input.pages.read(apiConfig, frame);
            frame.data.status.should.eql('all');
            frame.data.page.should.eql(true);
        });
    });
});
