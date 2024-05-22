const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const models = require('../../../../core/server/models');

describe('Unit: models/MemberCreatedEvent', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('validation', function () {
        it('throws error for invalid attribution_type', function () {
            return models.MemberCreatedEvent.add({attribution_type: 'invalid', source: 'member', member_id: '123'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    should(err).lengthOf(1);
                    (err[0] instanceof errors.ValidationError).should.eql(true);
                    err[0].context.should.match(/members_created_events\.attribution_type/);
                });
        });

        it('throws if member_id is missing', function () {
            return models.MemberCreatedEvent.add({attribution_type: 'post', source: 'member'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    should(err).lengthOf(1);
                    (err[0] instanceof errors.ValidationError).should.eql(true);
                    err[0].context.should.match(/members_created_events\.member_id/);
                });
        });

        it('throws if source is missing', function () {
            return models.MemberCreatedEvent.add({attribution_type: 'post', member_id: '123'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    should(err).lengthOf(1);
                    (err[0] instanceof errors.ValidationError).should.eql(true);
                    err[0].context.should.match(/members_created_events\.source/);
                });
        });

        it('throws if source is invalid', function () {
            return models.MemberCreatedEvent.add({attribution_type: 'post', member_id: '123', source: 'invalid'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    should(err).lengthOf(1);
                    (err[0] instanceof errors.ValidationError).should.eql(true);
                    err[0].context.should.match(/members_created_events\.source/);
                });
        });
    });
});
