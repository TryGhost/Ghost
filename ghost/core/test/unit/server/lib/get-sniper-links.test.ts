import assert from 'node:assert/strict';
import * as dns from 'node:dns/promises';
import {shuffle} from 'lodash-es';
import {getSniperLinks} from '../../../../core/server/lib/get-sniper-links';

describe('getSniperLinks', function () {
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
                await getSniperLinks({
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
            const result = await getSniperLinks({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            assert(result?.desktop.startsWith('https://mail.google.com/'));
            assert(result?.desktop.includes(encodeURIComponent(recipient)));
            assert(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            assert(result?.android.startsWith('intent://'));
            assert(result?.android.includes('com.google.android.gm'));
            assert(result?.android.includes('browser_fallback_url'));
        }));
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
                const result = await getSniperLinks({
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
            const result = await getSniperLinks({
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
            const result = await getSniperLinks({
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
            const result = await getSniperLinks({
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
            const result = await getSniperLinks({
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
            const result = await getSniperLinks({
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
            const result = await getSniperLinks({
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
            const result = await getSniperLinks({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            assert(result?.desktop.includes('mail.google.com'));
        });
    });
});
