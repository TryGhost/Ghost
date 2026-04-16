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

    it('includes a mailto link with prefilled subject and body in the HTML', async function () {
        await service.sendPurchaseConfirmation(defaultData);

        const msg = mailer.send.getCall(0).args[0];

        // Handlebars HTML-escapes some characters (including `=` → `&#x3D;`) when
        // interpolating into an attribute. The browser decodes these back when the
        // user clicks the link, so we don't care about the encoding here — we just
        // verify the link is a mailto and that the encoded subject and body are
        // present in the rendered output.
        const expectedSubject = encodeURIComponent('I got you a gift subscription to Test Site');
        const expectedBody = encodeURIComponent('Hi,\n\nI bought you a subscription to Test Site. You can redeem it here:\n\nhttps://example.com/gift/abc-123');

        sinon.assert.match(msg.html, sinon.match('mailto:'));
        sinon.assert.match(msg.html, sinon.match(expectedSubject));
        sinon.assert.match(msg.html, sinon.match(expectedBody));
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

    describe('sendReminder', function () {
        const reminderData = {
            memberEmail: 'member@example.com',
            memberName: 'Member Name',
            tierName: 'Gold',
            cadence: 'year',
            duration: 1,
            consumesAt: new Date('2026-04-23T00:00:00.000Z')
        };

        it('sends to the redeemer with a site-scoped subject and from address', async function () {
            await service.sendReminder(reminderData);

            sinon.assert.calledOnce(mailer.send);
            sinon.assert.calledWith(mailer.send, sinon.match({
                to: 'member@example.com',
                subject: 'Your gift subscription to Test Site is ending soon',
                from: 'Test Site <noreply@example.com>'
            }));
        });

        it('includes tier name, cadence, consumesAt, and manage subscription url in both HTML and text', async function () {
            await service.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('Gold'));
                sinon.assert.match(msg[field], sinon.match('1 year'));
                sinon.assert.match(msg[field], sinon.match('23 Apr 2026'));
                sinon.assert.match(msg[field], sinon.match('https://example.com/#/portal/account'));
            }
        });

        it('uses a generic greeting when the member has no name', async function () {
            await service.sendReminder({...reminderData, memberName: null});

            const msg = mailer.send.getCall(0).args[0];

            sinon.assert.match(msg.text, sinon.match(/^Hi,/));
        });

        it('includes the member name when provided', async function () {
            await service.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];

            sinon.assert.match(msg.text, sinon.match('Hi Member Name,'));
            sinon.assert.match(msg.html, sinon.match('Hi Member Name,'));
        });

        it('formats month cadence correctly', async function () {
            await service.sendReminder({...reminderData, cadence: 'month', duration: 3});

            sinon.assert.calledWith(mailer.send, sinon.match.has('html', sinon.match('3 months')));
        });
    });
});
