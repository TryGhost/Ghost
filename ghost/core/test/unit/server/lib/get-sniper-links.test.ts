import assert from 'node:assert/strict';
import {getSniperLinks} from '../../../../core/server/lib/get-sniper-links';

describe('getSniperLinks', function () {
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
                    sender: 'ignored@example.com'
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
                sender: 'sender@example.com'
            });
            assert(result?.desktop.startsWith('https://mail.google.com/'));
            assert(result?.desktop.includes(encodeURIComponent(recipient)));
            assert(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            assert(result?.android.startsWith('intent://'));
            assert(result?.android.includes('com.google.android.gm'));
            assert(result?.android.includes('browser_fallback_url'));
        }));
    });
});
