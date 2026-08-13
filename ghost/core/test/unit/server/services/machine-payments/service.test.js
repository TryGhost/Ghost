const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {MachinePaymentsService} = require('../../../../../core/server/services/machine-payments/service');

describe('Unit: server/services/machine-payments/service', function () {
    let labsService;
    let settings;
    let mppAdapter;
    let contentLoader;
    let eventRepository;
    let paymentRecorder;

    beforeEach(function () {
        sinon.stub(logging, 'warn');

        labsService = {
            isSet: sinon.stub().returns(false)
        };
        labsService.isSet.withArgs('machinePayments').returns(true);
        settings = {
            get: sinon.stub()
        };
        settings.get.withArgs('llms_enabled').returns(true);
        settings.get.withArgs('machine_payments_enabled').returns(true);
        settings.get.withArgs('machine_payments_amount').returns(100);
        settings.get.withArgs('machine_payments_currency').returns('USD');

        mppAdapter = {
            name: 'mpp',
            canHandle: sinon.stub().returns(false),
            challenge: sinon.stub().resolves(new Response('', {
                status: 402,
                headers: {'WWW-Authenticate': 'Payment realm="mpp"'}
            })),
            fulfill: sinon.stub().resolves({
                protocol: 'mpp',
                method: 'tempo',
                reference: '0xtx',
                amount: 100,
                currency: 'USD'
            })
        };

        contentLoader = {
            isPurchasable: sinon.stub().resolves(true),
            loadFullEntry: sinon.stub().resolves({
                id: 'post1',
                title: 'Paid',
                html: '<p>Secret</p>',
                url: 'http://example.com/paid/',
                visibility: 'paid'
            })
        };

        eventRepository = {save: sinon.stub().resolves({created: true, event: {id: 'evt1'}})};
        paymentRecorder = {record: sinon.stub().resolves('pi_123')};
    });

    afterEach(function () {
        sinon.restore();
    });

    function createService(overrides = {}) {
        return new MachinePaymentsService({
            settingsCache: settings,
            labsService,
            adapters: [mppAdapter],
            contentLoader,
            eventRepository,
            paymentRecorder,
            isStripeConnected: () => true,
            defaultCurrencyProvider: async () => 'USD',
            ...overrides
        });
    }

    it('is enabled when lab, setting, llms, and stripe are on', function () {
        assert.equal(createService().isEnabled(), true);
    });

    it('fails closed when machinePayments lab is off', function () {
        labsService.isSet.withArgs('machinePayments').returns(false);
        assert.equal(createService().isEnabled(), false);
    });

    it('fails closed without stripe', function () {
        assert.equal(createService({isStripeConnected: () => false}).isEnabled(), false);
    });

    it('returns a 402 challenge without loading content', async function () {
        const service = createService();
        const renderMarkdown = sinon.stub().returns('# body');

        const response = await service.challengeOrFulfill(new Request('http://example.com/paid.md'), {
            entryId: 'post1',
            resourceType: 'posts',
            description: 'Paid',
            contentLocation: '/paid.md',
            renderMarkdown
        });

        assert.equal(response.status, 402);
        assert.equal(response.headers.get('WWW-Authenticate'), 'Payment realm="mpp"');
        sinon.assert.calledOnce(contentLoader.isPurchasable);
        sinon.assert.notCalled(contentLoader.loadFullEntry);
        sinon.assert.notCalled(renderMarkdown);
    });

    it('returns 403 before charging mixed free+paid tier posts', async function () {
        contentLoader.isPurchasable.resolves(false);
        mppAdapter.canHandle.returns(true);
        const service = createService();

        const response = await service.challengeOrFulfill(new Request('http://example.com/mixed.md', {
            headers: {authorization: 'Payment abc'}
        }), {
            entryId: 'post1',
            resourceType: 'posts',
            contentLocation: '/mixed.md',
            renderMarkdown: () => '# body'
        });

        assert.equal(response.status, 403);
        sinon.assert.notCalled(mppAdapter.fulfill);
        sinon.assert.notCalled(contentLoader.loadFullEntry);
    });

    it('refuses replayed credentials when the ledger insert is not new', async function () {
        mppAdapter.canHandle.returns(true);
        eventRepository.save.resolves({created: false, event: {id: 'evt1'}});
        const service = createService();

        const response = await service.challengeOrFulfill(new Request('http://example.com/paid.md', {
            headers: {authorization: 'Payment abc'}
        }), {
            entryId: 'post1',
            resourceType: 'posts',
            contentLocation: '/paid.md',
            renderMarkdown: () => '# Secret'
        });

        assert.equal(response.status, 403);
        assert.match(await response.text(), /already been used/);
        sinon.assert.calledOnce(contentLoader.loadFullEntry);
        sinon.assert.calledOnce(mppAdapter.fulfill);
        sinon.assert.notCalled(paymentRecorder.record);
    });

    it('loads content before settling so undeliverable posts never charge', async function () {
        mppAdapter.canHandle.returns(true);
        contentLoader.loadFullEntry.resolves(null);
        const service = createService();

        const response = await service.challengeOrFulfill(new Request('http://example.com/paid.md', {
            headers: {authorization: 'Payment abc'}
        }), {
            entryId: 'post1',
            resourceType: 'posts',
            contentLocation: '/paid.md',
            renderMarkdown: () => '# Secret'
        });

        assert.equal(response.status, 403);
        assert.match(await response.text(), /not available for machine payment/);
        sinon.assert.calledOnce(contentLoader.loadFullEntry);
        sinon.assert.notCalled(mppAdapter.fulfill);
        sinon.assert.notCalled(eventRepository.save);
        sinon.assert.notCalled(paymentRecorder.record);
    });

    it('appends multiple WWW-Authenticate challenges from adapters', async function () {
        const secondaryAdapter = {
            name: 'secondary',
            canHandle: sinon.stub().returns(false),
            challenge: sinon.stub().resolves(new Response('', {
                status: 402,
                headers: {
                    'PAYMENT-REQUIRED': 'secondary-challenge',
                    'WWW-Authenticate': 'Payment realm="secondary"'
                }
            })),
            fulfill: sinon.stub()
        };
        const service = createService({adapters: [mppAdapter, secondaryAdapter]});

        const response = await service.challengeOrFulfill(new Request('http://example.com/paid.md'), {
            entryId: 'post1',
            resourceType: 'posts',
            contentLocation: '/paid.md',
            renderMarkdown: () => '# body'
        });

        assert.equal(response.status, 402);
        assert.equal(response.headers.get('PAYMENT-REQUIRED'), 'secondary-challenge');
        // Headers.get joins duplicate WWW-Authenticate values with ", "
        const wwwAuthenticate = response.headers.get('WWW-Authenticate');
        assert.match(wwwAuthenticate, /Payment realm="mpp"/);
        assert.match(wwwAuthenticate, /Payment realm="secondary"/);
    });

    it('loads content before fulfill, then writes the ledger', async function () {
        mppAdapter.canHandle.returns(true);
        const service = createService();
        const renderMarkdown = sinon.stub().returns('# Secret');

        const response = await service.challengeOrFulfill(new Request('http://example.com/paid.md', {
            headers: {authorization: 'Payment abc'}
        }), {
            entryId: 'post1',
            resourceType: 'posts',
            description: 'Paid',
            contentLocation: '/paid.md',
            renderMarkdown
        });

        assert.equal(response.status, 200);
        assert.equal(await response.text(), '# Secret');
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        sinon.assert.callOrder(contentLoader.loadFullEntry, mppAdapter.fulfill, eventRepository.save, paymentRecorder.record);
        sinon.assert.calledOnce(renderMarkdown);
    });

    it('returns 503 when no adapter can challenge', async function () {
        mppAdapter.challenge.resolves(null);
        const service = createService();

        const response = await service.challengeOrFulfill(new Request('http://example.com/paid.md'), {
            entryId: 'post1',
            resourceType: 'posts',
            contentLocation: '/paid.md',
            renderMarkdown: () => ''
        });

        assert.equal(response.status, 503);
    });
});
