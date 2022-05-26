const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const labs = require('../../../../../../../core/shared/labs');
const memberSerializer = require('../../../../../../../core/server/api/canary/utils/serializers/output/members');

describe('Unit: canary/utils/serializers/output/members', function () {
    let memberModel;
    let labsStub;
    beforeEach(function () {
        memberModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };
        labsStub = sinon.stub(labs, 'isSet').returns(true);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('browse: includes newsletter data', function () {
        const apiConfig = {docName: 'members'};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = memberModel(testUtils.DataGenerator.forKnex.createMemberWithNewsletter());
        memberSerializer.browse({
            data: [ctrlResponse],
            meta: null
        }, apiConfig, frame);
        should.exist(frame.response.members[0].newsletters);
    });

    it('browse: includes tiers data', function () {
        const apiConfig = {docName: 'members'};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = memberModel(testUtils.DataGenerator.forKnex.createMemberWithProducts());
        memberSerializer.browse({
            data: [ctrlResponse],
            meta: null
        }, apiConfig, frame);

        should.exist(frame.response.members[0].tiers);
    });

    it('read: includes newsletter data', function () {
        const apiConfig = {docName: 'members'};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = memberModel(testUtils.DataGenerator.forKnex.createMemberWithNewsletter());
        memberSerializer.read(ctrlResponse, apiConfig, frame);
        should.exist(frame.response.members[0].newsletters);
    });

    it('read: includes tiers data', function () {
        const apiConfig = {docName: 'members'};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = memberModel(testUtils.DataGenerator.forKnex.createMemberWithProducts());
        memberSerializer.read(ctrlResponse, apiConfig, frame);

        should.exist(frame.response.members[0].tiers);
    });
});
