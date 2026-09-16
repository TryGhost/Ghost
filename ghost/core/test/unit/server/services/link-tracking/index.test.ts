import assert from 'node:assert/strict';
import sinon from 'sinon';
import ObjectID from 'bson-objectid';

const DomainEvents = require('@tryghost/domain-events');

const models = require('../../../../../core/server/models');
const linkRedirection = require('../../../../../core/server/services/link-redirection');
const linkTracking = require('../../../../../core/server/services/link-tracking');
const LinkClickTrackingService = require('../../../../../core/server/services/link-tracking/link-click-tracking-service');
const RedirectEvent = require('../../../../../core/server/services/link-redirection/redirect-event');

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
    const init = sinon.stub(LinkClickTrackingService.prototype, 'init').callsFake(function (
      this: InstanceType<typeof LinkClickTrackingService>,
      ...args: Parameters<typeof originalInit>
    ) {
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

  it('wires automation click persistence and analytics to the same transaction', async function () {
    linkRedirection.service = {};
    linkRedirection.linkRedirectRepository = {};

    const subscribe = sinon.stub(DomainEvents, 'subscribe');
    const member = {
      id: 'member-id',
      get: sinon.stub().returns(null),
    };
    sinon.stub(models.Member, 'findOne').resolves(member);
    sinon.stub(models.MemberClickEvent, 'add').resolves({ id: ObjectID().toHexString() });
    const trackEmailClicked = sinon.stub().resolves();

    const executionPromise = Promise.resolve();
    const transacting = { executionPromise };
    const transaction = sinon
      .stub(models.Base, 'transaction')
      .callsFake(async (...args: unknown[]) => {
        const callback = args[0] as (trx: typeof transacting) => Promise<unknown>;
        return await callback(transacting);
      });

    const wrapper = new linkTracking.LinkTrackingServiceWrapper({
      automationsApi: { trackEmailClicked },
    });
    await wrapper.init();

    const subscriber = subscribe.firstCall.args[1];
    const clickedAt = new Date('2026-07-29T12:34:56.000Z');
    const linkId = ObjectID();
    await subscriber(
      RedirectEvent.create(
        {
          url: new URL('https://example.com/destination?m=memberUuid&step=run-step-id'),
          link: {
            link_id: linkId,
            automationActionRevisionId: 'revision-id',
          },
        },
        clickedAt,
      ),
    );

    sinon.assert.calledOnce(transaction);
    sinon.assert.calledOnceWithExactly(
      models.MemberClickEvent.add,
      {
        redirect_id: linkId.toHexString(),
        member_id: 'member-id',
      },
      { transacting },
    );
    sinon.assert.calledOnceWithExactly(
      trackEmailClicked,
      {
        automationActionRevisionId: 'revision-id',
        automationRunStepId: 'run-step-id',
        memberId: 'member-id',
        clickedAt,
      },
      { transacting },
    );
  });
});
