const should = require('should');
const serializers = require('../../../../../../../core/server/api/utils/serializers');

describe('Unit: api/utils/serializers/input/members', function () {
    describe('all', function () {
        it('converts tiers include', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {},
                    withRelated: ['tiers']
                }
            };

            serializers.input.members.all(apiConfig, frame);
            should(frame.options.withRelated).containEql('products');
        });
    });
});
