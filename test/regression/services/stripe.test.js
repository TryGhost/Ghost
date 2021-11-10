const sinon = require('sinon');
const rewire = require('rewire');

const events = require('events');

const rewiredStripeService = rewire('../../../core/server/services/stripe');

describe('Stripe Service', function () {
    beforeEach(function () {
        this.clock = sinon.useFakeTimers();
    });

    afterEach(function () {
        this.clock.restore();
    });

    it('Emits a "services.stripe.reconfigured" event when it is reconfigured', async function () {
        const eventsStub = new events.EventEmitter();
        const configureApiStub = sinon.spy();

        const emitReconfiguredEventSpy = sinon.spy(eventsStub, 'emit').withArgs('services.stripe.reconfigured');

        rewiredStripeService.__set__('events', eventsStub);

        await rewiredStripeService.init();

        // This is _after_ init, because init calls configureApi, and we DGAF about that call.
        rewiredStripeService.__set__('configureApi', configureApiStub);

        eventsStub.emit('settings.edited', {
            get: sinon.stub().withArgs('key').returns('stripe_connect_secret_key')
        });

        this.clock.tick(600);

        sinon.assert.callOrder(configureApiStub, emitReconfiguredEventSpy);
    });
});
