const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

describe('Unit: v2/utils/serializers/input/posts', function () {
    it('default', function () {
        const apiConfig = {};
        const frame = {
            options: {}
        };

        serializers.input.posts.all(apiConfig, frame);
        frame.options.filter.should.eql('page:false');
    });

    it('combine filters', function () {
        const apiConfig = {};
        const frame = {
            options: {
                filter: 'status:published+tag:eins'
            }
        };

        serializers.input.posts.all(apiConfig, frame);
        frame.options.filter.should.eql('status:published+tag:eins+page:false');
    });

    it('remove existing page filter', function () {
        const apiConfig = {};
        const frame = {
            options: {
                filter: 'page:true+tag:eins'
            }
        };

        serializers.input.posts.all(apiConfig, frame);
        frame.options.filter.should.eql('tag:eins+page:false');
    });

    it('remove existing page filter', function () {
        const apiConfig = {};
        const frame = {
            options: {
                filter: 'page:true'
            }
        };

        serializers.input.posts.all(apiConfig, frame);
        frame.options.filter.should.eql('page:false');
    });
});
