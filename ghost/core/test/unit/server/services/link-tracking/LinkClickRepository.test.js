const should = require('should');
const sinon = require('sinon');
const ObjectID = require('bson-objectid').default;
const configUtils = require('../../../../utils/configUtils');

const LinkClickRepository = require('../../../../../core/server/services/link-tracking/LinkClickRepository');
const LinkClick = require('../../../../../core/server/services/link-tracking/ClickEvent');

const linkClicks = [
    new LinkClick({
        link_id: ObjectID(),
        member_uuid: 'test-uuid'
    }),
    new LinkClick({
        link_id: ObjectID(),
        member_uuid: 'test-uuid'
    })
];

describe('UNIT: LinkClickRepository class', function () {
    let linkClickRepository;
    let memberStub;
    let memberLinkClickEventModelStub;
    let memberLinkClickEventStub;
    let domainEventsStub;

    beforeEach(function () {
        memberStub = {
            findOne: sinon.stub()
        };

        memberLinkClickEventModelStub = {
            add: sinon.stub()
        };

        memberLinkClickEventStub = {
            create: sinon.stub()
        };

        domainEventsStub = {
            dispatch: sinon.stub()
        };

        linkClickRepository = new LinkClickRepository({
            MemberLinkClickEventModel: memberLinkClickEventModelStub,
            Member: memberStub,
            MemberLinkClickEvent: memberLinkClickEventStub,
            DomainEvents: domainEventsStub
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('save', function () {
        afterEach(function () {
            configUtils.restore();
        });

        it('should save a link click event when member is found', async function () {
            const member = {
                id: 'member-id',
                get: sinon.stub().returns('last-seen-at')
            };

            memberStub.findOne.resolves(member);
            memberLinkClickEventModelStub.add.resolves({id: ObjectID().toHexString()});
            // configStub.get.withArgs('linkClickTrackingCacheMemberUuid').returns(true);

            await linkClickRepository.save(linkClicks[0]);

            sinon.assert.calledOnce(memberStub.findOne);
            sinon.assert.calledOnce(memberLinkClickEventModelStub.add);
            sinon.assert.calledOnce(memberLinkClickEventStub.create);
            sinon.assert.calledOnce(domainEventsStub.dispatch);
        });

        it('should not save a link click event when member is not found', async function () {
            memberStub.findOne.resolves(null);
            await linkClickRepository.save(linkClicks[0]);
            sinon.assert.notCalled(memberLinkClickEventModelStub.add);
            sinon.assert.notCalled(memberLinkClickEventStub.create);
            sinon.assert.notCalled(domainEventsStub.dispatch);
        });

        it('should always call findOne when cacheMemberUuidLinkClick is false', async function () {
            configUtils.set('linkClickTrackingCacheMemberUuid', false);
            await linkClickRepository.save(linkClicks[0]);
            sinon.assert.calledOnce(memberStub.findOne);
            await linkClickRepository.save(linkClicks[1]);
            sinon.assert.calledTwice(memberStub.findOne);
        });

        it('should use memoized findOne when cacheMemberUuidLinkClick is true', async function () {
            configUtils.set('linkClickTrackingCacheMemberUuid', true);
            await linkClickRepository.save(linkClicks[0]);
            sinon.assert.calledOnce(memberStub.findOne);
            await linkClickRepository.save(linkClicks[1]);
            sinon.assert.calledOnce(memberStub.findOne);
        });
    });
});
