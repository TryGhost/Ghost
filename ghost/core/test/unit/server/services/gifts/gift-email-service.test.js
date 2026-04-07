const sinon = require('sinon');
const {GiftEmailService} = require('../../../../../core/server/services/gifts/gift-email-service');

describe('GiftEmailService', function () {
    let mailer;
    let service;

    const settingsCache = {
        get: (key) => {
            if (key === 'title') {
                return 'Test Site';
            }
            if (key === 'accent_color') {
                return '#ff5500';
            }

            return '';
        }
    };

    const urlUtils = {
        getSiteUrl: () => 'https://example.com/'
    };

    const getFromAddress = () => 'Test Site <noreply@example.com>';

    const blogIcon = {
        getIconUrl: () => 'https://example.com/icon.png'
    };

    const defaultData = {
        buyerEmail: 'buyer@example.com',
        amount: 5000,
        currency: 'usd',
        token: 'abc-123',
        tierName: 'Gold',
        cadence: 'year',
        duration: 1,
        expiresAt: new Date('2027-04-07')
    };

    beforeEach(function () {
        mailer = {send: sinon.stub().resolves()};
        service = new GiftEmailService({mailer, settingsCache, urlUtils, getFromAddress, blogIcon});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('sends to the buyer email with correct subject and from address', async function () {
        await service.sendPurchaseConfirmation(defaultData);

        sinon.assert.calledOnce(mailer.send);
        sinon.assert.calledWith(mailer.send, sinon.match({
            to: 'buyer@example.com',
            subject: 'Gift subscription purchase confirmation',
            from: 'Test Site <noreply@example.com>'
        }));
    });

    it('includes gift link, tier name, and cadence in both HTML and text', async function () {
        await service.sendPurchaseConfirmation(defaultData);

        const msg = mailer.send.getCall(0).args[0];

        for (const field of ['html', 'text']) {
            sinon.assert.match(msg[field], sinon.match('https://example.com/gift/abc-123'));
            sinon.assert.match(msg[field], sinon.match('Gold'));
            sinon.assert.match(msg[field], sinon.match('1 year'));
        }
    });

    it('includes formatted amount in both HTML and text', async function () {
        await service.sendPurchaseConfirmation(defaultData);

        const msg = mailer.send.getCall(0).args[0];

        for (const field of ['html', 'text']) {
            sinon.assert.match(msg[field], sinon.match('$50.00'));
        }
    });

    it('formats non-USD currency correctly', async function () {
        await service.sendPurchaseConfirmation({...defaultData, amount: 1500, currency: 'eur'});

        sinon.assert.calledWith(mailer.send, sinon.match.has('html', sinon.match('€15.00')));
    });

    it('formats month cadence correctly', async function () {
        await service.sendPurchaseConfirmation({...defaultData, cadence: 'month'});

        sinon.assert.calledWith(mailer.send, sinon.match.has('html', sinon.match('1 month')));
    });

    it('falls back to site domain when site title is undefined', async function () {
        const noTitleSettingsCache = {
            get: (key) => {
                if (key === 'title') {
                    return undefined;
                }
                if (key === 'accent_color') {
                    return '#ff5500';
                }

                return '';
            }
        };

        const noTitleService = new GiftEmailService({mailer, settingsCache: noTitleSettingsCache, urlUtils, getFromAddress, blogIcon});
        await noTitleService.sendPurchaseConfirmation(defaultData);

        sinon.assert.calledWith(mailer.send, sinon.match.has('text', sinon.match('gift subscription on example.com')));
    });
});
