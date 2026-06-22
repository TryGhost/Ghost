const sinon = require('sinon');
const {MemberPaidSubscriptionEvent} = require('../../../../core/server/models/member-paid-subscription-event');

describe('Unit: models/MemberPaidSubscriptionEvent', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('Has member and subscriptionCreatedEvent relations', function () {
        const model = MemberPaidSubscriptionEvent.forge({id: 'any'});
        model.member();
        model.subscriptionCreatedEvent();
    });

    it('Has filter relations', function () {
        const model = MemberPaidSubscriptionEvent.forge({id: 'any'});
        model.filterRelations();
    });
});
