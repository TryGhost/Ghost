import assert from 'node:assert/strict';
import * as dns from 'node:dns/promises';
import {shuffle} from 'lodash-es';
import {getInboxLinks} from '../../../../core/server/lib/get-inbox-links';

describe('getInboxLinks', function () {
    const resolverThatShouldNeverBeUsed = {
        resolveMx: () => {
            assert.fail('This DNS test resolver should never be used');
        }
    };

    it('returns undefined for invalid recipient emails', async function () {
        const emails = [
            '',
            'foo',
            'example.com'
        ];
        for (const email of emails) {
            assert.equal(
                await getInboxLinks({
                    recipient: email,
                    sender: 'ignored@example.com',
                    dnsResolver: resolverThatShouldNeverBeUsed
                }),
                undefined
            );
        }
    });

    it('handles Google emails', async function () {
        const emails = [
            'example@gmail.com',
            'example@googlemail.com',
            'example@google.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await getInboxLinks({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            assert.equal(result?.provider, 'gmail');
            assert(result?.desktop.startsWith('https://mail.google.com/'));
            assert(result?.desktop.includes(recipient));
            assert(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            assert(result?.android.startsWith('intent:'));
            assert(result?.android.includes('com.google.android.gm'));
            assert(result?.android.includes('browser_fallback_url'));
        }));

        const nonAsciiResult = await getInboxLinks({
            recipient: 'examplé@gmail.com',
            sender: 'sendér@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        assert(nonAsciiResult?.desktop.includes('exampl%C3%A9@gmail.com'));
        assert(nonAsciiResult?.desktop.includes(encodeURIComponent('sendér@example.com')));
    });

    it('handles Yahoo emails', async function () {
        const emails = [
            'example@yahoo.com',
            'example@myyahoo.com',
            'example@yahoo.co.uk',
            'example@yahoo.fr',
            'example@yahoo.it',
            'example@ymail.com',
            'example@rocketmail.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await getInboxLinks({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            assert.equal(result?.provider, 'yahoo');
            assert(result?.desktop.startsWith('https://mail.yahoo.com/d/search/keyword=from:'));
            assert(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            assert(result?.android.startsWith('intent:'));
            assert(result?.android.includes('com.yahoo.mobile.client.android.mail'));
            assert(result?.android.includes('browser_fallback_url'));
        }));
    });

    it('handles Microsoft emails', async function () {
        const emails = [
            'example@outlook.com',
            'example@live.com',
            'example@live.de',
            'example@hotmail.com',
            'example@hotmail.co.uk',
            'example@hotmail.de',
            'example@msn.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await getInboxLinks({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            assert.equal(result?.provider, 'outlook');
            assert.equal(result?.desktop, `https://outlook.live.com/mail/?login_hint=${encodeURIComponent(recipient)}`);
            assert(result?.android.startsWith('intent:'));
            assert(result?.android.includes('com.microsoft.office.outlook'));
            assert(result?.android.includes('browser_fallback_url'));
        }));
    });

    it('handles Proton emails', async function () {
        const emails = [
            'example@proton.me',
            'example@pm.me',
            'example@protonmail.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await getInboxLinks({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            assert.equal(result?.provider, 'proton');
            assert(result?.desktop.startsWith('https://mail.proton.me/'));
            assert(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            assert(result?.android.startsWith('intent:'));
            assert(result?.android.includes('ch.protonmail.android'));
            assert(result?.android.includes('browser_fallback_url'));
        }));
    });

    it('handles iCloud emails', async function () {
        const emails = [
            'example@icloud.com',
            'example@me.com',
            'example@mac.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await getInboxLinks({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            assert.equal(result?.provider, 'icloud');
            assert.equal(result?.desktop, 'https://www.icloud.com/mail');
            assert.equal(result?.android, 'https://www.icloud.com/mail');
        }));
    });

    it('handles Hey emails', async function () {
        const result = await getInboxLinks({
            recipient: 'example@hey.com',
            sender: 'sender@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        assert.equal(result?.provider, 'hey');
        assert.equal(result?.desktop, 'https://app.hey.com/topics/everything');
        assert(result?.android.startsWith('intent:'));
        assert(result?.android.includes('com.basecamp.hey'));
        assert(result?.android.includes('browser_fallback_url'));
    });

    it('handles AOL emails', async function () {
        const result = await getInboxLinks({
            recipient: 'example@aol.com',
            sender: 'sender@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        assert.equal(result?.provider, 'aol');
        assert(result?.desktop.startsWith('https://mail.aol.com/'));
        assert(result?.desktop.includes(encodeURIComponent('sender@example.com')));
        assert(result?.android.startsWith('intent:'));
        assert(result?.android.includes('com.aol.mobile.aolapp'));
        assert(result?.android.includes('browser_fallback_url'));
    });

    it('handles Mail.ru emails', async function () {
        const result = await getInboxLinks({
            recipient: 'example@mail.ru',
            sender: 'sender@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        assert.equal(result?.provider, 'mailru');
        assert(result?.desktop.startsWith('https://e.mail.ru/search/'));
        assert(result?.desktop.includes(encodeURIComponent('sender@example.com')));
        assert(result?.android.startsWith('intent:'));
        assert(result?.android.includes('ru.mail.mailapp'));
        assert(result?.android.includes('browser_fallback_url'));
    });

    describe('DNS lookups', function () {
        it('returns undefined if the MX resolution fails for any reason', async function () {
            const errors = [
                new Error('Unexpected error'),
                Object.assign(new Error(), {code: dns.TIMEOUT}),
                Object.assign(new Error(), {code: dns.NODATA})
            ];
            await Promise.all(errors.map(async (error) => {
                const resolver = {
                    resolveMx: () => Promise.reject(error)
                };
                const result = await getInboxLinks({
                    recipient: 'recipient@example.com',
                    sender: 'sender@example.com',
                    dnsResolver: resolver
                });
                assert.equal(result, undefined);
            }));
        });

        it('returns undefined if the MX resolution returns a null MX record', async function () {
            const resolver = {
                resolveMx: async () => [
                    {priority: 0, exchange: ''}
                ]
            };
            const result = await getInboxLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert.equal(result, undefined);
        });

        it('returns undefined if no MX exchanges are recognized', async function () {
            const resolver = {
                resolveMx: async () => shuffle([
                    {priority: 1, exchange: 'one.example'},
                    {priority: 2, exchange: 'two.example'},
                    {priority: 3, exchange: 'three.example'},
                    {priority: 4, exchange: 'google.com.example'}
                ])
            };
            const result = await getInboxLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert.equal(result, undefined);
        });

        it('returns undefined if the first recognized MX exchange has the same priority as one that is not recognized, just in case', async function () {
            const resolver = {
                resolveMx: async () => shuffle([
                    {priority: 1, exchange: 'ignored.example'},
                    {priority: 2, exchange: 'gmail.com'},
                    {priority: 2, exchange: 'unknown.example'}
                ])
            };
            const result = await getInboxLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert.equal(result, undefined);
        });

        it('returns undefined if two exchanges with the same priority are both recognized, just in case', async function () {
            const resolver = {
                resolveMx: async () => shuffle([
                    {priority: 1, exchange: 'ignored.example'},
                    {priority: 2, exchange: 'gmail.com'},
                    {priority: 2, exchange: 'protonmail.ch'}
                ])
            };
            const result = await getInboxLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert.equal(result, undefined);
        });

        it('returns the first recognized provider if a top-level domain', async function () {
            const resolver = {
                resolveMx: async () => shuffle([
                    {priority: 1, exchange: 'ignored.example'},
                    {priority: 2, exchange: 'gmail.com'},
                    {priority: 3, exchange: 'yahoo.com'}
                ])
            };
            const result = await getInboxLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert(result?.desktop.includes('mail.google.com'));
        });

        it('returns the first recognized provider if a subdomain', async function () {
            const resolver = {
                resolveMx: async () => shuffle([
                    {priority: 1, exchange: 'ignored.example'},
                    {priority: 2, exchange: 'aspmx.l.google.com'},
                    {priority: 3, exchange: 'mail.protonmail.ch'}
                ])
            };
            const result = await getInboxLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert(result?.desktop.includes('mail.google.com'));
        });

        it('handles two exchanges with the same priority but the same provider', async function () {
            const resolver = {
                resolveMx: async () => shuffle([
                    {priority: 1, exchange: 'ignored.example'},
                    {priority: 2, exchange: 'aspmx.l.google.com'},
                    {priority: 2, exchange: 'aspmx2.googlemail.com'},
                    {priority: 3, exchange: 'mail.protonmail.ch'}
                ])
            };
            const result = await getInboxLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert(result?.desktop.includes('mail.google.com'));
        });
    });
});
