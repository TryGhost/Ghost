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
            subject: 'Your gift is ready to share',
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

        sinon.assert.calledWith(mailer.send, sinon.match.has('text', sinon.match('Thank you for supporting example.com')));
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
            tierName: 'Gold',
            tierPrice: 10000,
            tierCurrency: 'usd',
            cadence: 'year',
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

        it('includes consumesAt, post-gift price and manage subscription url in both HTML and text', async function () {
            await service.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];
            const expectedDate = new Intl.DateTimeFormat('en-gb', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(reminderData.consumesAt);

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match(expectedDate));
                sinon.assert.match(msg[field], sinon.match('$100.00/year'));
                sinon.assert.match(msg[field], sinon.match('https://example.com/#/portal/account'));
            }
        });

        it('renders a "Continue membership" CTA', async function () {
            await service.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];

            sinon.assert.match(msg.html, sinon.match('Continue membership'));
            sinon.assert.match(msg.text, sinon.match('Continue membership'));
        });

        it('formats month cadence in the post-gift price', async function () {
            await service.sendReminder({...reminderData, cadence: 'month', tierPrice: 1000});

            sinon.assert.calledWith(mailer.send, sinon.match.has('html', sinon.match('$10.00/month')));
        });

        it('formats non-USD currency correctly in the post-gift price', async function () {
            await service.sendReminder({...reminderData, tierCurrency: 'eur', tierPrice: 1500});

            sinon.assert.calledWith(mailer.send, sinon.match.has('html', sinon.match('€15.00/year')));
        });

        it('formats the post-gift price, cadence, and expiry date with the active locale', async function () {
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
                t: translate({year: 'an'})
            });

            await localizedService.sendReminder(reminderData);

            const msg = mailer.send.getCall(0).args[0];
            const expectedPrice = new Intl.NumberFormat('fr', {
                style: 'currency',
                currency: reminderData.tierCurrency,
                currencyDisplay: 'symbol',
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
            }).format(reminderData.tierPrice / 100);
            const expectedDate = new Intl.DateTimeFormat('fr', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(reminderData.consumesAt);

            for (const field of ['html', 'text']) {
                sinon.assert.match(msg[field], sinon.match(`${expectedPrice}/an`));
                sinon.assert.match(msg[field], sinon.match(expectedDate));
            }
        });
    });
});
