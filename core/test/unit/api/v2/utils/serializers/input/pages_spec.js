const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

describe('Unit: v2/utils/serializers/input/pages', function () {
    it('default', function () {
        const apiConfig = {};
        const options = {
            modelOptions: {

            }
        };

        serializers.input.pages.all(apiConfig, options);
        options.modelOptions.filter.should.eql('page:true');
    });

    it('combine filters', function () {
        const apiConfig = {};
        const options = {
            modelOptions: {
                filter: 'status:published+tag:eins'
            }
        };

        serializers.input.pages.all(apiConfig, options);
        options.modelOptions.filter.should.eql('status:published+tag:eins+page:true');
    });

    it('remove existing page filter', function () {
        const apiConfig = {};
        const options = {
            modelOptions: {
                filter: 'page:false+tag:eins'
            }
        };

        serializers.input.pages.all(apiConfig, options);
        options.modelOptions.filter.should.eql('tag:eins+page:true');
    });

    it('remove existing page filter', function () {
        const apiConfig = {};
        const options = {
            modelOptions: {
                filter: 'page:false'
            }
        };

        serializers.input.pages.all(apiConfig, options);
        options.modelOptions.filter.should.eql('page:true');
    });
});
