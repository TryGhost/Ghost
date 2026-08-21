import {createTierFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import type {APIRequestContext} from '@playwright/test';

/**
 * What a publisher configures, what Stripe is asked for, and what lands on the member.
 *
 * The three are covered separately elsewhere — the session parameters by unit tests, the
 * write path by Ghost's own integration tests. What only this can show is that they meet:
 * a configuration made through the API produces a real checkout request, and a real
 * completed session puts the answers on the member's own fields.
 *
 * The completion is built on a session captured from Stripe test mode after a real card
 * payment, so the placement of everything collected is Stripe's rather than ours: the
 * address under `shipping`, the recipient beside it rather than inside it, the tax id under
 * `customer_details`. A test substitutes values into that captured structure and cannot
 * supply anything the checkout never asked for.
 */

interface CheckoutSessionResponse {
    url: string;
}

interface CustomFieldResponse {
    members_custom_fields: Array<{key: string; name: string}>;
}

interface MemberResponse {
    members: Array<{id: string; email: string; custom_fields: Record<string, unknown>}>;
}

test.describe('Ghost Public - Stripe Checkout Fields', () => {
    test.use({stripeEnabled: true, labs: {membersCustomFields: true}});

    async function createField(request: APIRequestContext, name: string, type: string): Promise<string> {
        const response = await request.post('/ghost/api/admin/members/custom_fields/', {
            data: {members_custom_fields: [{name, type}]}
        });
        expect(response.ok(), await response.text()).toBe(true);
        const body = await response.json() as CustomFieldResponse;
        return body.members_custom_fields[0].key;
    }

    async function configureCheckout(request: APIRequestContext, tierId: string, checkout: Record<string, unknown>): Promise<void> {
        const response = await request.put(`/ghost/api/admin/tiers/${tierId}/checkout_config/`, {
            data: {tiers_checkout_config: [checkout]}
        });
        expect(response.ok(), await response.text()).toBe(true);
    }

    async function readMember(request: APIRequestContext, email: string): Promise<MemberResponse['members'][number]> {
        const found = await request.get(`/ghost/api/admin/members/?search=${encodeURIComponent(email)}`);
        const list = await found.json() as MemberResponse;
        expect(list.members, `no member found for ${email}`).toHaveLength(1);

        const read = await request.get(`/ghost/api/admin/members/${list.members[0].id}/`);
        const body = await read.json() as MemberResponse;
        return body.members[0];
    }

    test('collects a publisher\'s questions and a delivery address, and saves both on the member', async ({page, stripe}) => {
        const tierFactory = createTierFactory(page.request);
        const memberEmail = `checkout-fields-${Date.now()}@example.com`;

        const tier = await tierFactory.create({
            name: `Print Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 600,
            yearly_price: 6000
        });

        const question = await createField(page.request, 'T-shirt size', 'short_text');
        const recipient = await createField(page.request, 'Recipient name', 'short_text');
        const address = await createField(page.request, 'Delivery address', 'address');

        // The address arrives from Stripe with no Ghost key on it, so the collection says
        // where it goes. The question needs no destination: its answer comes back under the
        // key Ghost sent.
        await configureCheckout(page.request, tier.id, {
            custom_fields: [{key: question, label: 'Which size?'}],
            shipping: {
                collect: true,
                allowed_countries: ['GB', 'IE'],
                name: {custom_field_key: recipient},
                address: {custom_field_key: address}
            }
        });

        const response = await page.request.post('/members/api/create-stripe-checkout-session/', {
            data: {
                customerEmail: memberEmail,
                tierId: tier.id,
                cadence: 'month',
                successUrl: 'http://localhost/success',
                cancelUrl: 'http://localhost/cancel'
            }
        });
        expect(response.ok(), await response.text()).toBe(true);

        const sessionResponse = await response.json() as CheckoutSessionResponse;
        const session = stripe!.getCheckoutSessions().at(-1);
        expect(sessionResponse.url).toBe(session?.response.url);

        // What the publisher configured, as Stripe was asked for it. The label overrides
        // the field's own name, which is what keeps a long field name from failing the
        // session create.
        expect(session?.request.custom_fields).toEqual([{
            key: question,
            type: 'text',
            optional: true,
            label: {custom: 'Which size?'}
        }]);
        expect(session?.request.shipping_address_collection).toEqual({allowed_countries: ['GB', 'IE']});

        await stripe!.completeLatestSubscriptionCheckout({
            name: 'Print Member',
            collected: {
                answers: {[question]: 'Large'},
                shipping: {
                    name: 'Bex Jones, c/o Acme Ltd',
                    line1: '1 High Street',
                    city: 'London',
                    postal_code: 'E1 6AN',
                    country: 'GB'
                }
            }
        });

        const member = await readMember(page.request, memberEmail);
        expect(member.custom_fields[question]).toBe('Large');
        // One Stripe parameter collects the recipient and the address together, and the
        // publisher chose a separate field for each. This is the only test that shows both
        // halves arriving from one real session and landing where they were told to.
        expect(member.custom_fields[recipient]).toBe('Bex Jones, c/o Acme Ltd');
        // Stripe's address parts are exactly ours, so nothing is transformed.
        expect(member.custom_fields[address]).toEqual({
            line1: '1 High Street',
            city: 'London',
            postal_code: 'E1 6AN',
            country: 'GB'
        });
    });

    // The safety property this whole path turns on: a site that configured nothing must
    // send the request it always sent. A rejected session create is a publisher who cannot
    // sell, and this code path has taken checkout down twice before.
    test('asks Stripe for nothing when a tier has configured nothing', async ({page, stripe}) => {
        const tierFactory = createTierFactory(page.request);
        const memberEmail = `checkout-nothing-${Date.now()}@example.com`;

        const tier = await tierFactory.create({
            name: `Plain Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 600,
            yearly_price: 6000
        });

        const response = await page.request.post('/members/api/create-stripe-checkout-session/', {
            data: {
                customerEmail: memberEmail,
                tierId: tier.id,
                cadence: 'month',
                successUrl: 'http://localhost/success',
                cancelUrl: 'http://localhost/cancel'
            }
        });
        expect(response.ok(), await response.text()).toBe(true);

        const session = stripe!.getCheckoutSessions().at(-1);
        expect(session?.request.custom_fields).toBeUndefined();
        expect(session?.request.shipping_address_collection).toBeUndefined();
        expect(session?.request.phone_number_collection).toBeUndefined();

        await stripe!.completeLatestSubscriptionCheckout({name: 'Plain Member'});

        const member = await readMember(page.request, memberEmail);
        expect(member.custom_fields).toEqual({});
    });

    // The helper is checked against the session Ghost created, so a test cannot prove a
    // member answered something the checkout never rendered.
    test('refuses to complete a checkout with data it never collected', async ({page, stripe}) => {
        const tierFactory = createTierFactory(page.request);

        const tier = await tierFactory.create({
            name: `Unconfigured Tier ${Date.now()}`,
            currency: 'usd',
            monthly_price: 600,
            yearly_price: 6000
        });

        await page.request.post('/members/api/create-stripe-checkout-session/', {
            data: {
                customerEmail: `checkout-refuses-${Date.now()}@example.com`,
                tierId: tier.id,
                cadence: 'month',
                successUrl: 'http://localhost/success',
                cancelUrl: 'http://localhost/cancel'
            }
        });

        await expect(stripe!.completeLatestSubscriptionCheckout({
            collected: {answers: {t_shirt_size: 'Large'}}
        })).rejects.toThrow(/never asked for "t_shirt_size"/);

        await expect(stripe!.completeLatestSubscriptionCheckout({
            collected: {shipping: {line1: '1 High Street'}}
        })).rejects.toThrow(/never asked for a shipping address/);
    });
});
