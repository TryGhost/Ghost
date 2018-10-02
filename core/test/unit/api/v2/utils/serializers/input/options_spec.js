const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

describe('Unit: v2/utils/serializers/input/options', function () {
    it('default', function () {
        const apiConfig = {};
        const options = {
            apiOptions: {
                x: 'y'
            }
        };

        serializers.input.options.all(apiConfig, options);
        options.modelOptions.x.should.eql('y');
    });

    it('transforms attrs into model language', function () {
        const apiConfig = {};
        const options = {
            apiOptions: {
                include: 'tags',
                fields: 'id,status',
                formats: 'html'
            }
        };

        serializers.input.options.all(apiConfig, options);
        should.exist(options.apiOptions.include);
        should.exist(options.apiOptions.fields);
        should.exist(options.apiOptions.formats);

        should.not.exist(options.modelOptions.include);
        should.not.exist(options.modelOptions.fields);
        should.exist(options.modelOptions.formats);
        should.exist(options.modelOptions.columns);
        should.exist(options.modelOptions.withRelated);

        options.modelOptions.withRelated.should.eql(['tags']);
        options.modelOptions.columns.should.eql(['id','status','html']);
        options.modelOptions.formats.should.eql(['html']);
    });
});
