import assert from 'node:assert/strict';
import sinon from 'sinon';

const DomainEvents = require('@tryghost/domain-events');

const linkRedirection = require('../../../../../core/server/services/link-redirection');
const linkTracking = require('../../../../../core/server/services/link-tracking');
const LinkClickTrackingService = require('../../../../../core/server/services/link-tracking/link-click-tracking-service');

describe('LinkTrackingServiceWrapper', function () {
    const originalLinkRedirectionService = linkRedirection.service;
    const originalLinkRedirectRepository = linkRedirection.linkRedirectRepository;

    afterEach(function () {
        sinon.restore();
        linkRedirection.service = originalLinkRedirectionService;
        linkRedirection.linkRedirectRepository = originalLinkRedirectRepository;
    });

    it('waits for the same initialization when called concurrently', async function () {
        linkRedirection.service = {};
        linkRedirection.linkRedirectRepository = {};

        let finishInitialization!: () => void;
        const initialization = new Promise<void>((resolve) => {
            finishInitialization = resolve;
        });
        const originalInit = LinkClickTrackingService.prototype.init;
        const subscribe = sinon.stub(DomainEvents, 'subscribe');
        const init = sinon.stub(LinkClickTrackingService.prototype, 'init').callsFake(function (this: InstanceType<typeof LinkClickTrackingService>, ...args: Parameters<typeof originalInit>) {
            originalInit.apply(this, args);
            return initialization;
        });
        const wrapper = new linkTracking.LinkTrackingServiceWrapper();

        const firstInit = wrapper.init();
        const secondInit = wrapper.init();
        let secondInitFinished = false;
        secondInit.then(() => {
            secondInitFinished = true;
        });

        sinon.assert.calledOnce(init);
        sinon.assert.calledOnce(subscribe);
        assert.equal(wrapper.service, undefined);
        await Promise.resolve();
        assert.equal(secondInitFinished, false);

        finishInitialization();
        await Promise.all([firstInit, secondInit]);

        assert.ok(wrapper.service);
    });

    it('allows initialization to be retried after a failure', async function () {
        linkRedirection.service = {};
        linkRedirection.linkRedirectRepository = {};

        const init = sinon.stub(LinkClickTrackingService.prototype, 'init');
        init.onFirstCall().rejects(new Error('Initialization failed'));
        init.onSecondCall().resolves();
        const wrapper = new linkTracking.LinkTrackingServiceWrapper();

        await assert.rejects(wrapper.init(), /Initialization failed/);
        await wrapper.init();

        sinon.assert.calledTwice(init);
        assert.ok(wrapper.service);
    });
});
