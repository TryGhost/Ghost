import {MembersService} from '@/helpers/services/members';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Stripe Webhooks', () => {
    test.use({stripeEnabled: true});

    // Ghost creates a member from Stripe checkout webhooks; this tests the post-Portal redirect flow
    test('member created via webhooks - has paid status', async ({stripe, page}) => {
        const membersService = new MembersService(page.request);
        const email = `stripe-test-${Date.now()}@example.com`;

        await stripe!.createPaidMemberViaWebhooks({email, name: 'Test User'});

        const member = await membersService.getByEmail(email);
        expect(member.status).toBe('paid');
    });
});
