const sinon = require('sinon');
const {MemberClickEvent} = require('../../../../core/server/models/member-click-event');

describe('Unit: models/MemberClickEvent', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('Has link and member relations', function () {
        const model = MemberClickEvent.forge({id: 'any'});
        model.link();
        model.member();
    });

    it('Has filter relations', function () {
        const model = MemberClickEvent.forge({id: 'any'});
        model.filterRelations();
    });
});
