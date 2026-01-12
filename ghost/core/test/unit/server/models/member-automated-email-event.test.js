const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const models = require('../../../../core/server/models');

describe('Unit: models/MemberAutomatedEmailEvent', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('immutability', function () {
        it('throws on edit', async function () {
            try {
                await models.MemberAutomatedEmailEvent.edit({});
                should.fail('edit should throw');
            } catch (err) {
                (err instanceof errors.IncorrectUsageError).should.eql(true);
                err.message.should.eql('Cannot edit MemberAutomatedEmailEvent');
            }
        });

        it('throws on destroy', async function () {
            try {
                await models.MemberAutomatedEmailEvent.destroy({});
                should.fail('destroy should throw');
            } catch (err) {
                (err instanceof errors.IncorrectUsageError).should.eql(true);
                err.message.should.eql('Cannot destroy MemberAutomatedEmailEvent');
            }
        });
    });
});

