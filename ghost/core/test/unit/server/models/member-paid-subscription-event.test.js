const sinon = require('sinon');
const models = require('../../../../core/server/models');

describe('Unit: models/MemberPaidSubscriptionEvent', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Has member and subscriptionCreatedEvent relations', function () {
        const model = models.MemberPaidSubscriptionEvent.forge({id: 'any'});
        model.member();
        model.subscriptionCreatedEvent();
    });

    it('Has filter relations', function () {
        const model = models.MemberPaidSubscriptionEvent.forge({id: 'any'});
        model.filterRelations();
    });
});
