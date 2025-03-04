const sinon = require('sinon');
const models = require('../../../../core/server/models');

describe('Unit: models/MemberClickEvent', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Has link and member relations', function () {
        const model = models.MemberClickEvent.forge({id: 'any'});
        model.link();
        model.member();
    });

    it('Has filter relations', function () {
        const model = models.MemberClickEvent.forge({id: 'any'});
        model.filterRelations();
    });
});
