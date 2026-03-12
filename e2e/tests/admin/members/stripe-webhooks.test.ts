import {MembersService} from '@/helpers/services/members';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Stripe Webhooks', () => {
    test.use({stripeEnabled: true});

    test('member created via webhooks - has paid status', async ({stripe, page}) => {
        const membersService = new MembersService(page.request);
        const email = `stripe-test-${Date.now()}@example.com`;

        await stripe!.createPaidMemberViaWebhooks({email, name: 'Test User'});

        const member = await membersService.getByEmail(email);
        expect(member.status).toBe('paid');
    });
});

test.describe('Ghost Admin - Stripe Subscription Lifecycle', () => {
    test.use({stripeEnabled: true});

    test('subscription canceled at period end - member remains paid', async ({stripe, page}) => {
        const membersService = new MembersService(page.request);
        const email = `stripe-cancel-${Date.now()}@example.com`;

        const {subscription} = await stripe!.createPaidMemberViaWebhooks({email, name: 'Cancel Test'});

        await stripe!.cancelSubscription({subscription});

        const member = await membersService.getByEmailWithSubscriptions(email);
        expect(member.status).toBe('paid');
        expect(member.subscriptions[0].cancel_at_period_end).toBe(true);
    });

    test('subscription deleted - member becomes free', async ({stripe, page}) => {
        const membersService = new MembersService(page.request);
        const email = `stripe-delete-${Date.now()}@example.com`;

        const {subscription} = await stripe!.createPaidMemberViaWebhooks({email, name: 'Delete Test'});

        await stripe!.deleteSubscription({subscription});

        const member = await membersService.getByEmail(email);
        expect(member.status).toBe('free');
    });

    test('invoice payment succeeded - webhook processed without error', async ({stripe, page}) => {
        const membersService = new MembersService(page.request);
        const email = `stripe-invoice-${Date.now()}@example.com`;

        const {subscription} = await stripe!.createPaidMemberViaWebhooks({email, name: 'Invoice Test'});

        await stripe!.sendInvoicePaymentSucceeded({subscription});

        const member = await membersService.getByEmail(email);
        expect(member.status).toBe('paid');
    });
});
