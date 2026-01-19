const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const models = require('../../../../core/server/models');

describe('Unit: models/AutomatedEmailRecipient', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('immutability', function () {
        it('throws on edit', async function () {
            try {
                await models.AutomatedEmailRecipient.edit({});
                should.fail('edit should throw');
            } catch (err) {
                (err instanceof errors.IncorrectUsageError).should.eql(true);
                err.message.should.eql('Cannot edit AutomatedEmailRecipient');
            }
        });

        it('throws on destroy', async function () {
            try {
                await models.AutomatedEmailRecipient.destroy({});
                should.fail('destroy should throw');
            } catch (err) {
                (err instanceof errors.IncorrectUsageError).should.eql(true);
                err.message.should.eql('Cannot destroy AutomatedEmailRecipient');
            }
        });
    });
});
