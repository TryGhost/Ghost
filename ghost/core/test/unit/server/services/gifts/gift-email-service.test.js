const assert = require('node:assert/strict');
const sinon = require('sinon');
const {GiftEmailService} = require('../../../../../core/server/services/gifts/gift-email-service');

describe('GiftEmailService', function () {
    let transactionalMailer;
    let bulkMailer;
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
        const escapeValue = options.interpolation?.escapeValue !== false;
        const params = {...options};
        delete params.interpolation;

        return translatedKey.replace(/\{(\w+)\}/g, (_, name) => {
            if (params[name] === undefined) {
                return `{${name}}`;
            }
            const value = String(params[name]);

            return escapeValue ? value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\//g, '&#x2F;')
                .replace(/'/g, '&#39;') : value;
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
        transactionalMailer = {send: sinon.stub().resolves()};
        bulkMailer = {
            isConfigured: sinon.stub().returns(true),
            send: sinon.stub().resolves({id: '<provider-123>'})
        };
        service = new GiftEmailService({transactionalMailer, bulkMailer, settingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('sends to the buyer email with correct subject and from address', async function () {
        await service.sendPurchaseConfirmation(defaultData);

        sinon.assert.calledOnce(transactionalMailer.send);
        sinon.assert.calledWith(transactionalMailer.send, sinon.match({
            to: 'buyer@example.com',
            subject: 'Your gift is ready',
            from: 'Test Site <noreply@example.com>',
            disableTracking: true
        }));
    });

    it('tells the buyer an email gift is on its way to the recipient', async function () {
        await service.sendPurchaseConfirmation({
            ...defaultData,
            recipientEmail: 'recipient@example.com'
        });

        const message = transactionalMailer.send.firstCall.firstArg;
        assert.equal(message.subject, 'Your gift is on its way');
        for (const field of ['html', 'text']) {
            sinon.assert.match(message[field], sinon.match('recipient@example.com'));
            sinon.assert.match(message[field], sinon.match('is on its way to'));
            sinon.assert.match(message[field], sinon.match(value => !value.includes('has been sent to')));
            sinon.assert.match(message[field], sinon.match('You can also share the link below yourself'));
        }
    });

    it('includes gift link, tier name, and cadence in both HTML and text', async function () {
        await service.sendPurchaseConfirmation(defaultData);

        const msg = transactionalMailer.send.getCall(0).args[0];

        for (const field of ['html', 'text']) {
            sinon.assert.match(msg[field], sinon.match('https://example.com/gift/abc-123'));
            sinon.assert.match(msg[field], sinon.match('Gold'));
        }
        sinon.assert.match(msg.html, sinon.match('<strong>1</strong>-year'));
        sinon.assert.match(msg.text, sinon.match('1-year'));
    });

    it('formats month cadence correctly', async function () {
        await service.sendPurchaseConfirmation({...defaultData, cadence: 'month'});

        const message = transactionalMailer.send.firstCall.firstArg;
        sinon.assert.match(message.html, sinon.match('<strong>1</strong>-month'));
        sinon.assert.match(message.text, sinon.match('1-month'));
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
        const localizedService = new GiftEmailService({transactionalMailer, bulkMailer, settingsCache: localizedSettingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});

        await localizedService.sendPurchaseConfirmation(defaultData);

        const msg = transactionalMailer.send.getCall(0).args[0];
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

        const noTitleService = new GiftEmailService({transactionalMailer, bulkMailer, settingsCache: noTitleSettingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});
        await noTitleService.sendPurchaseConfirmation(defaultData);

        sinon.assert.calledWith(transactionalMailer.send, sinon.match.has('text', sinon.match('membership to example.com')));
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

        const hostileService = new GiftEmailService({transactionalMailer, bulkMailer, settingsCache: hostileSettingsCache, urlUtils, getFromAddress, blogIcon, t: translate()});
        await hostileService.sendPurchaseConfirmation({
            ...defaultData,
            buyerEmail: 'buyer">@example.com',
            tierName: 'Gold <img src=x onerror=alert(1)>'
        });

        const msg = transactionalMailer.send.getCall(0).args[0];

        // raw markup from injected fields must not appear in the HTML body
        sinon.assert.match(msg.html, sinon.match(value => !value.includes('<script>alert(1)</script>')));
        sinon.assert.match(msg.html, sinon.match(value => !value.includes('<img src=x onerror=alert(1)>')));
        sinon.assert.match(msg.html, sinon.match(value => !value.includes('buyer">@example.com')));

        // but the structural <strong> + <a> tags from the template must still render
        sinon.assert.match(msg.html, sinon.match(/<strong>Gold &lt;img/));
        sinon.assert.match(msg.html, sinon.match(/<a class="small" href="mailto:buyer/));
    });

    describe('sendGiftDelivery', function () {
        it('sends the prototype delivery content through bulk Mailgun without open or click tracking', async function () {
            const result = await service.sendGiftDelivery({
                recipientEmail: 'recipient@example.com',
                recipientName: 'Recipient',
                buyerEmail: 'buyer@example.com',
                buyerName: 'Buyer',
                personalMessage: 'Enjoy this gift',
                token: 'abc-123',
                tierName: 'Gold',
                benefits: ['All stories'],
                cadence: 'year',
                duration: 1,
                expiresAt: new Date('2027-04-07')
            });

            assert.deepEqual(result, {providerMessageId: 'provider-123'});
            sinon.assert.notCalled(transactionalMailer.send);
            const message = bulkMailer.send.firstCall.firstArg;
            sinon.assert.match(message, {
                subject: 'Buyer sent you a gift',
                tags: ['gift-delivery'],
                disable_tracking: true
            });
            assert.deepEqual(bulkMailer.send.firstCall.args[1], {'recipient@example.com': {}});
            for (const field of ['html', 'plaintext']) {
                sinon.assert.match(message[field], sinon.match('Recipient'));
                sinon.assert.match(message[field], sinon.match('Enjoy this gift'));
                sinon.assert.match(message[field], sinon.match('All stories'));
                sinon.assert.match(message[field], sinon.match('https://example.com/gift/abc-123'));
            }
            sinon.assert.match(message.plaintext, sinon.match('Buyer has gifted you a 1-year Gold membership to Test Site'));
            sinon.assert.match(message.plaintext, sinon.match('Redeem your gift:\nhttps://example.com/gift/abc-123'));
            sinon.assert.match(message.plaintext, sinon.match('This message was sent from example.com to recipient@example.com on behalf of Buyer (buyer@example.com).'));
            sinon.assert.match(message.html, sinon.match('Redeem your gift:'));
            sinon.assert.match(message.html, sinon.match('<strong>Buyer</strong> has gifted you a <strong>1</strong>-year <strong>Gold</strong> membership to Test Site'));
            sinon.assert.match(message.html, sinon.match('on behalf of Buyer (<a href="mailto:buyer@example.com"'));
        });

        it('falls back to transactional email when bulk Mailgun is not configured', async function () {
            bulkMailer.isConfigured.returns(false);

            const result = await service.sendGiftDelivery({
                recipientEmail: 'recipient@example.com',
                recipientName: 'Recipient',
                buyerEmail: 'buyer@example.com',
                buyerName: 'Buyer',
                personalMessage: 'Enjoy this gift',
                token: 'abc-123',
                tierName: 'Gold',
                benefits: ['All stories'],
                cadence: 'year',
                duration: 1,
                expiresAt: new Date('2027-04-07')
            });

            assert.deepEqual(result, {providerMessageId: null});
            sinon.assert.notCalled(bulkMailer.send);
            sinon.assert.calledOnceWithExactly(transactionalMailer.send, sinon.match({
                to: 'recipient@example.com',
                subject: 'Buyer sent you a gift',
                from: 'Test Site <noreply@example.com>',
                tags: ['gift-delivery'],
                disableTracking: true,
                forceTextContent: true,
                html: sinon.match('https://example.com/gift/abc-123'),
                text: sinon.match('https://example.com/gift/abc-123')
            }));
        });

        it('uses an attributive plural cadence for multi-month gifts', async function () {
            await service.sendGiftDelivery({
                recipientEmail: 'recipient@example.com',
                recipientName: null,
                buyerEmail: 'buyer@example.com',
                buyerName: 'Buyer',
                personalMessage: null,
                token: 'abc-123',
                tierName: 'Gold',
                benefits: [],
                cadence: 'month',
                duration: 3,
                expiresAt: new Date('2027-04-07')
            });

            const message = bulkMailer.send.firstCall.firstArg;
            sinon.assert.match(message.plaintext, sinon.match('a 3-month Gold membership'));
            sinon.assert.match(message.html, sinon.match('<strong>3</strong>-month'));
            sinon.assert.match(message.html, sinon.match(value => !value.includes('3 months')));
            sinon.assert.match(message.plaintext, sinon.match(value => !value.includes('3 months')));
        });

        it('escapes recipient-controlled delivery content in HTML', async function () {
            await service.sendGiftDelivery({
                recipientEmail: 'recipient@example.com',
                recipientName: '<img src=x onerror=alert(1)>',
                buyerEmail: 'buyer@example.com',
                buyerName: '<script>alert(1)</script>',
                personalMessage: '<b>not markup</b>',
                token: 'abc-123',
                tierName: 'Gold',
                benefits: ['<i>benefit</i>'],
                cadence: 'month',
                duration: 1,
                expiresAt: new Date('2027-04-07')
            });

            const html = bulkMailer.send.firstCall.firstArg.html;
            assert.ok(!html.includes('<script>alert(1)</script>'));
            assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
            assert.ok(!html.includes('<b>not markup</b>'));
            assert.ok(!html.includes('<i>benefit</i>'));
        });

        it('preserves literal interpolation characters in the subject and plain-text body', async function () {
            const literalSettingsCache = {
                get: (key) => {
                    if (key === 'title') {
                        return 'Research & <Notes>';
                    }
                    if (key === 'accent_color') {
                        return '#ff5500';
                    }
                    return '';
                }
            };
            const literalService = new GiftEmailService({
                transactionalMailer,
                bulkMailer,
                settingsCache: literalSettingsCache,
                urlUtils,
                getFromAddress,
                blogIcon,
                t: translate()
            });

            await literalService.sendGiftDelivery({
                recipientEmail: 'recipient@example.com',
                recipientName: 'Pat O\'Neil & Co',
                buyerEmail: 'buyer@example.com',
                buyerName: 'Sam & Alex <Team>',
                personalMessage: null,
                token: 'abc-123',
                tierName: 'Gold & Silver <Plus>',
                benefits: [],
                cadence: 'year',
                duration: 1,
                expiresAt: new Date('2027-04-07')
            });

            const message = bulkMailer.send.firstCall.firstArg;
            assert.equal(message.subject, 'Sam & Alex <Team> sent you a gift');
            assert.match(message.plaintext, /Hi Pat O'Neil & Co,/);
            assert.match(message.plaintext, /Sam & Alex <Team> has gifted you a 1-year Gold & Silver <Plus> membership to Research & <Notes>/);
            assert.match(message.plaintext, /on behalf of Sam & Alex <Team> \(buyer@example.com\)\./);
            assert.doesNotMatch(message.plaintext, /&(amp|lt|gt|#39);/);
        });

        it('rejects delivery when bulk Mailgun does not return an acceptance ID', async function () {
            bulkMailer.send.resolves('Message sent');

            await assert.rejects(service.sendGiftDelivery({
                recipientEmail: 'recipient@example.com',
                recipientName: null,
                buyerEmail: 'buyer@example.com',
                buyerName: 'Buyer',
                personalMessage: null,
                token: 'abc-123',
                tierName: 'Gold',
                benefits: [],
                cadence: 'month',
                duration: 1,
                expiresAt: new Date('2027-04-07')
            }), {code: 'EMAIL_NOT_ACCEPTED'});
            sinon.assert.notCalled(transactionalMailer.send);
        });

        it('does not fall back when configured bulk Mailgun rejects the send', async function () {
            const error = new Error('Mailgun rejected the send');
            bulkMailer.send.rejects(error);

            await assert.rejects(service.sendGiftDelivery({
                recipientEmail: 'recipient@example.com',
                recipientName: null,
                buyerEmail: 'buyer@example.com',
                buyerName: 'Buyer',
                personalMessage: null,
                token: 'abc-123',
                tierName: 'Gold',
                benefits: [],
                cadence: 'month',
                duration: 1,
                expiresAt: new Date('2027-04-07')
            }), error);
            sinon.assert.notCalled(transactionalMailer.send);
        });
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

            sinon.assert.calledOnce(transactionalMailer.send);
            sinon.assert.calledWith(transactionalMailer.send, sinon.match({
                to: 'member@example.com',
                subject: 'Your gift subscription is ending soon',
                from: 'Test Site <noreply@example.com>'
            }));
        });

        it('includes consumesAt and manage subscription url in both HTML and text', async function () {
            await service.sendReminder(reminderData);

            const msg = transactionalMailer.send.getCall(0).args[0];
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

            const msg = transactionalMailer.send.getCall(0).args[0];

            sinon.assert.match(msg.html, sinon.match('Continue subscription'));
            sinon.assert.match(msg.text, sinon.match('Continue subscription'));
        });

        it('greets the redeemer by first name when a name is available', async function () {
            await service.sendReminder(reminderData);

            const msg = transactionalMailer.send.getCall(0).args[0];

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match('Hi Jamie,'));
            }
        });

        it('falls back to a generic greeting when no name is available', async function () {
            await service.sendReminder({...reminderData, memberName: null});

            const msg = transactionalMailer.send.getCall(0).args[0];

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
                transactionalMailer,
                bulkMailer,
                settingsCache: localizedSettingsCache,
                urlUtils,
                getFromAddress,
                blogIcon,
                t: translate()
            });

            await localizedService.sendReminder(reminderData);

            const msg = transactionalMailer.send.getCall(0).args[0];
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
});
