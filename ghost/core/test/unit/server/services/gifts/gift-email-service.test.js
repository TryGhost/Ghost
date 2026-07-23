const assert = require('node:assert/strict');
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

    const translate = (translations = {}) => (key, options = {}) => {
        const translatedKey = translations[key] || key;
        const params = {...options};
        delete params.interpolation;

        return translatedKey.replace(/\{(\w+)\}/g, (_, name) => {
            if (params[name] === undefined) {
                return `{${name}}`;
            }
            return String(params[name]);
        });
    };

    const defaultData = {
        buyerEmail: 'buyer@example.com',
        token: 'abc-123',
        tierName: 'Gold',
        cadence: 'year',
        duration: 1,
        expiresAt: new Date('2027-04-07')
    };

    beforeEach(function () {
        mailer = {send: sinon.stub().resolves()};
        service = new GiftEmailService({mailer, settingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('sends to the buyer email with correct subject and from address', async function () {
        await service.sendPurchaseConfirmation(defaultData);

        sinon.assert.calledOnce(mailer.send);
        sinon.assert.calledWith(mailer.send, sinon.match({
            to: 'buyer@example.com',
            subject: 'Your gift is ready',
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

    it('formats month cadence correctly', async function () {
        await service.sendPurchaseConfirmation({...defaultData, cadence: 'month'});

        sinon.assert.calledWith(mailer.send, sinon.match.has('html', sinon.match('1 month')));
    });

    it('formats the expiry date with the active locale', async function () {
        const localizedSettingsCache = {
            get: (key) => {
                if (key === 'title') {
                    return 'Test Site';
                }
                if (key === 'accent_color') {
                    return '#ff5500';
                }
                if (key === 'locale') {
                    return 'fr';
                }

                return '';
            }
        };
        const localizedService = new GiftEmailService({mailer, settingsCache: localizedSettingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});

        await localizedService.sendPurchaseConfirmation(defaultData);

        const msg = mailer.send.getCall(0).args[0];
        const expectedDate = new Intl.DateTimeFormat('fr', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(defaultData.expiresAt);

        sinon.assert.match(msg.html, sinon.match(expectedDate));
        sinon.assert.match(msg.text, sinon.match(expectedDate));
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

        const noTitleService = new GiftEmailService({mailer, settingsCache: noTitleSettingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});
        await noTitleService.sendPurchaseConfirmation(defaultData);

        sinon.assert.calledWith(mailer.send, sinon.match.has('text', sinon.match('membership to example.com')));
    });

    it('escapes user-controlled values containing HTML in the purchase confirmation HTML', async function () {
        const hostileSettingsCache = {
            get: (key) => {
                if (key === 'title') {
                    return 'Evil <script>alert(1)</script> Site';
                }
                if (key === 'accent_color') {
                    return '#ff5500';
                }
                return '';
            }
        };

        const hostileService = new GiftEmailService({mailer, settingsCache: hostileSettingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});
        await hostileService.sendPurchaseConfirmation({
            ...defaultData,
            buyerEmail: 'buyer">@example.com',
            tierName: 'Gold <img src=x onerror=alert(1)>'
        });

        const msg = mailer.send.getCall(0).args[0];

        // raw markup from injected fields must not appear in the HTML body
        sinon.assert.match(msg.html, sinon.match(value => !value.includes('<script>alert(1)</script>')));
        sinon.assert.match(msg.html, sinon.match(value => !value.includes('<img src=x onerror=alert(1)>')));
        sinon.assert.match(msg.html, sinon.match(value => !value.includes('buyer">@example.com')));

        // but the structural <strong> + <a> tags from the template must still render
        sinon.assert.match(msg.html, sinon.match(/<strong>Gold &lt;img/));
        sinon.assert.match(msg.html, sinon.match(/<a class="small" href="mailto:buyer/));
    });

    describe('sendReminder', function () {
        const reminderData = {
            memberEmail: 'member@example.com',
            memberName: 'Jamie Rivera',
            tierName: 'Gold',
            consumesAt: new Date('2026-04-23T00:00:00.000Z')
        };

        it('sends to the redeemer with the correct subject and from address', async function () {
            await service.sendReminder(reminderData);

            sinon.assert.calledOnce(mailer.send);
            sinon.assert.calledWith(mailer.send, sinon.match({
                to: 'member@example.com',
                subject: 'Your gift subscription is ending soon',
                from: 'Test Site <noreply@example.com>'
            }));
        });

        it('includes consumesAt and manage subscription url in both HTML and text', async function () {
            await service.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];
            const expectedDate = new Intl.DateTimeFormat('en-gb', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(reminderData.consumesAt);

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match(expectedDate));
                sinon.assert.match(msg[field], sinon.match('https://example.com/#/portal/account'));
            }
        });

        it('renders a "Continue subscription" CTA', async function () {
            await service.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];

            sinon.assert.match(msg.html, sinon.match('Continue subscription'));
            sinon.assert.match(msg.text, sinon.match('Continue subscription'));
        });

        it('greets the redeemer by first name when a name is available', async function () {
            await service.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('Hi Jamie,'));
            }
        });

        it('falls back to a generic greeting when no name is available', async function () {
            await service.sendReminder({...reminderData, memberName: null});

            const msg = mailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('Hey there,'));
            }
        });

        it('formats the expiry date with the active locale', async function () {
            const localizedSettingsCache = {
                get: (key) => {
                    if (key === 'title') {
                        return 'Test Site';
                    }
                    if (key === 'accent_color') {
                        return '#ff5500';
                    }
                    if (key === 'locale') {
                        return 'fr';
                    }

                    return '';
                }
            };
            const localizedService = new GiftEmailService({
                mailer,
                settingsCache: localizedSettingsCache,
                urlUtils,
                getFromAddress,
                blogIcon,
                t: translate()
            });

            await localizedService.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];
            const expectedDate = new Intl.DateTimeFormat('fr', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(reminderData.consumesAt);

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match(expectedDate));
            }
        });
    });

    describe('purchase confirmation with a recipient', function () {
        it('mentions the recipient when the gift was sent immediately', async function () {
            await service.sendPurchaseConfirmation({
                ...defaultData,
                recipientEmail: 'taylor@example.com',
                deliverAt: null
            });

            const msg = mailer.send.getCall(0).args[0];

            assert.equal(msg.subject, 'Your gift is on its way');

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('taylor@example.com'));
            }
        });

        it('leads the subject with the delivery date when delivery is scheduled', async function () {
            const deliverAt = new Date('2026-12-25');

            await service.sendPurchaseConfirmation({
                ...defaultData,
                recipientEmail: 'taylor@example.com',
                deliverAt
            });

            const expectedDate = new Intl.DateTimeFormat('en-gb', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(deliverAt);

            assert.equal(mailer.send.getCall(0).args[0].subject, `Your gift will be delivered on ${expectedDate}`);
        });

        it('mentions the recipient and delivery date when delivery is scheduled', async function () {
            const deliverAt = new Date('2026-12-25');

            await service.sendPurchaseConfirmation({
                ...defaultData,
                recipientEmail: 'taylor@example.com',
                deliverAt
            });

            const msg = mailer.send.getCall(0).args[0];
            const expectedDate = new Intl.DateTimeFormat('en-gb', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(deliverAt);

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('taylor@example.com'));
                sinon.assert.match(msg[field], sinon.match(expectedDate));
            }
        });
    });

    describe('sendGiftDelivery', function () {
        const deliveryData = {
            recipientEmail: 'taylor@example.com',
            buyerName: 'Sarah',
            recipientName: 'Taylor',
            message: 'Happy birthday!',
            token: 'abc-123',
            tierName: 'Gold',
            benefits: ['Weekly newsletter', 'Full archive access'],
            cadence: 'year',
            duration: 1,
            expiresAt: new Date('2027-04-07')
        };

        it('sends to the recipient with a personalised subject when the buyer gave a name', async function () {
            await service.sendGiftDelivery(deliveryData);

            sinon.assert.calledOnce(mailer.send);
            sinon.assert.calledWith(mailer.send, sinon.match({
                to: 'taylor@example.com',
                subject: 'Sarah sent you a gift',
                from: 'Test Site <noreply@example.com>'
            }));
        });

        it('falls back to a generic subject when no buyer name is given', async function () {
            await service.sendGiftDelivery({...deliveryData, buyerName: null});

            sinon.assert.calledWith(mailer.send, sinon.match({
                subject: 'You\'ve received a gift'
            }));
        });

        it('includes the redeem link, tier name and personal message in both HTML and text', async function () {
            await service.sendGiftDelivery(deliveryData);

            const msg = mailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('https://example.com/gift/abc-123'));
                sinon.assert.match(msg[field], sinon.match('Gold'));
                sinon.assert.match(msg[field], sinon.match('Happy birthday!'));
                sinon.assert.match(msg[field], sinon.match('Sarah'));
            }
        });

        it('lists the tier benefits in both HTML and text', async function () {
            await service.sendGiftDelivery(deliveryData);

            const msg = mailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('What\'s included'));
                sinon.assert.match(msg[field], sinon.match('Weekly newsletter'));
                sinon.assert.match(msg[field], sinon.match('Full archive access'));
            }
        });

        it('omits the benefits block when the tier has no benefits', async function () {
            await service.sendGiftDelivery({...deliveryData, benefits: []});

            const msg = mailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match(value => !value.includes('What\'s included'), 'no benefits block'));
            }
        });

        it('omits the message block when there is no message', async function () {
            await service.sendGiftDelivery({...deliveryData, message: null});

            const msg = mailer.send.getCall(0).args[0];

            sinon.assert.match(msg.html, sinon.match(value => !value.includes('&ldquo;'), 'no quote block'));
        });

        it('escapes HTML in the buyer-supplied message and name', async function () {
            await service.sendGiftDelivery({
                ...deliveryData,
                buyerName: '<script>alert("name")</script>',
                message: '<img src=x onerror=alert(1)> hello'
            });

            const msg = mailer.send.getCall(0).args[0];

            sinon.assert.match(msg.html, sinon.match(value => !value.includes('<script>alert'), 'no raw script tag'));
            sinon.assert.match(msg.html, sinon.match(value => !value.includes('<img src=x'), 'no raw img tag'));
        });
    });

    describe('sendDeliveredConfirmation', function () {
        const deliveredData = {
            buyerEmail: 'buyer@example.com',
            recipientEmail: 'taylor@example.com',
            token: 'abc-123',
            tierName: 'Gold',
            cadence: 'year',
            duration: 1,
            expiresAt: new Date('2027-04-07')
        };

        it('sends to the buyer with the delivered subject and from address', async function () {
            await service.sendDeliveredConfirmation(deliveredData);

            sinon.assert.calledOnce(mailer.send);
            sinon.assert.calledWith(mailer.send, sinon.match({
                to: 'buyer@example.com',
                subject: 'Your gift has been delivered',
                from: 'Test Site <noreply@example.com>'
            }));
        });

        it('includes the recipient, redeem link and expiry in both HTML and text', async function () {
            await service.sendDeliveredConfirmation(deliveredData);

            const msg = mailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('taylor@example.com'));
                sinon.assert.match(msg[field], sinon.match('https://example.com/gift/abc-123'));
                sinon.assert.match(msg[field], sinon.match('Gold'));
            }
        });
    });
});
