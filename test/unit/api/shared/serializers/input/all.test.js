const should = require('should');
const shared = require('../../../../../../core/server/api/shared');

describe('Unit: utils/serializers/input/all', function () {
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

                should.exist(frame.options.transacting);
                should.exist(frame.options.forUpdate);
                should.exist(frame.options.context);
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

                should.not.exist(frame.options.transacting);
                should.not.exist(frame.options.forUpdate);
                should.exist(frame.options.context);
            });
        });
    });
});
