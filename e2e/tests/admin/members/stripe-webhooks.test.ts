import {APIRequestContext} from '@playwright/test';
import {MembersService} from '@/helpers/services/members';
import {expect, test} from '@/helpers/playwright';

interface MemberEventsResponse {
    events?: Array<{
        type: string;
        data: {
            amount?: number;
        };
    }>;
}

async function waitForPaymentEvent(request: APIRequestContext, memberId: string, amount: number) {
    await expect.poll(async () => {
        const filter = encodeURIComponent(`type:payment_event+data.member_id:'${memberId}'`);
        const response = await request.get(`/ghost/api/admin/members/events/?filter=${filter}&limit=5`);

        if (!response.ok()) {
            return null;
        }

        const data = await response.json() as MemberEventsResponse;
        const paymentEvent = data.events?.find(event => event.type === 'payment_event');

        return paymentEvent?.data.amount ?? null;
    }, {timeout: 10000}).toBe(amount);
}

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
        expect(member.subscriptions).toHaveLength(1);
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
        const member = await membersService.getByEmail(email);

        await stripe!.sendInvoicePaymentSucceeded({subscription});
        await waitForPaymentEvent(page.request, member.id, subscription.items.data[0]?.price.unit_amount ?? 0);

        const updatedMember = await membersService.getByEmail(email);
        expect(updatedMember.status).toBe('paid');
    });
});
