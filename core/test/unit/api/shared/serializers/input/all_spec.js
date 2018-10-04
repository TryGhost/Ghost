const should = require('should');
const serializers = require('../../../../../../server/api/v2/utils/serializers/index');

describe('Unit: v2/utils/serializers/input/all', function () {
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
                formats: 'html'
            }
        };

        serializers.input.all(apiConfig, frame);
        should.exist(frame.original.include);
        should.exist(frame.original.fields);
        should.exist(frame.original.formats);

        should.not.exist(frame.options.include);
        should.not.exist(frame.options.fields);
        should.exist(frame.options.formats);
        should.exist(frame.options.columns);
        should.exist(frame.options.withRelated);

        frame.options.withRelated.should.eql(['tags']);
        frame.options.columns.should.eql(['id','status','html']);
        frame.options.formats.should.eql(['html']);
    });
});
