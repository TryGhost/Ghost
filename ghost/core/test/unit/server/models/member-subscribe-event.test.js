const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const models = require('../../../../core/server/models');

describe('Unit: models/MemberSubscribeEvent', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('validation', function () {
        it('throws if source is invalid', function () {
            return models.MemberSubscribeEvent.add({member_id: '123', source: 'invalid'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    should(err).lengthOf(1);
                    (err[0] instanceof errors.ValidationError).should.eql(true);
                    err[0].context.should.match(/members_subscribe_events\.source/);
                });
        });
    });
});
