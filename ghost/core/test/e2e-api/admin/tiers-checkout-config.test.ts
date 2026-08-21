import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Tier Checkout Admin API', function () {
    let agent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        post: (_url: string) => any;
        delete: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
    };
    let tierId: string;

    async function createField(field: {name: string, type?: string}) {
        const {body} = await agent
            .post('members/custom_fields/')
            .body({members_custom_fields: [{type: 'short_text', ...field}]})
            .expectStatus(201);
        return body.members_custom_fields[0];
    }

    async function setStatus(key: string, status: 'active' | 'archived') {
        await agent
            .put(`members/custom_fields/${key}/`)
            .body({members_custom_fields: [{status}]})
            .expectStatus(200);
    }

    async function setCheckout(config: Record<string, unknown>, status = 200) {
        const {body} = await agent
            .put(`tiers/${tierId}/checkout_config/`)
            .body({tiers_checkout_config: [config]})
            .expectStatus(status);
        return body;
    }

    async function readCheckout() {
        const {body} = await agent.get(`tiers/${tierId}/checkout_config/`).expectStatus(200);
        return body.tiers_checkout_config[0];
    }

    const shipping = (over: Record<string, unknown> = {}) => ({
        shipping: {
            collect: true,
            allowed_countries: ['GB'],
            address: {custom_field_key: 'delivery_address'},
            ...over
        }
    });

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();

        const {body} = await agent.get('tiers/?limit=1&filter=type:paid').expectStatus(200);
        tierId = body.tiers[0].id;
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('membersCustomFields');
    });

    afterEach(async function () {
        mockManager.restore();
        await models.Base.knex('products_checkout_fields').del();
        await models.Base.knex('products_checkout_config').del();
        await models.Base.knex('members_custom_field_bindings').del();
        await models.Base.knex('members_custom_fields').del();
        await models.Base.knex('products').where('id', 'ffffffffffffffffffffffff').del();
    });

    describe('Questions the checkout asks', function () {
        it('starts with nothing configured', async function () {
            assert.deepEqual(await readCheckout(), {tier_id: tierId, custom_fields: []});
        });

        it('keeps the questions in the order they were given', async function () {
            const size = await createField({name: 'T-shirt size'});
            const diet = await createField({name: 'Dietary requirements'});

            await setCheckout({custom_fields: [{key: diet.key}, {key: size.key}]});

            const {custom_fields: questions} = await readCheckout();
            assert.deepEqual(questions.map((question: {key: string}) => question.key), ['dietary_requirements', 't_shirt_size']);
        });

        // A question is optional unless a publisher chooses otherwise: a required question
        // at the payment step costs conversion.
        it('asks optionally, and under the field\'s own name, unless told otherwise', async function () {
            const size = await createField({name: 'T-shirt size'});

            await setCheckout({custom_fields: [{key: size.key}]});
            assert.deepEqual(await readCheckout(), {
                tier_id: tierId,
                custom_fields: [{key: 't_shirt_size', label: null, optional: true}]
            });

            await setCheckout({custom_fields: [{key: size.key, label: 'Which size?', optional: false}]});
            assert.deepEqual((await readCheckout()).custom_fields, [
                {key: 't_shirt_size', label: 'Which size?', optional: false}
            ]);
        });

        it('states the whole list, so a question left out is no longer asked', async function () {
            const size = await createField({name: 'T-shirt size'});
            const diet = await createField({name: 'Dietary requirements'});
            await setCheckout({custom_fields: [{key: size.key}, {key: diet.key}]});

            await setCheckout({custom_fields: [{key: diet.key}]});
            assert.deepEqual((await readCheckout()).custom_fields.map((question: {key: string}) => question.key), ['dietary_requirements']);
        });

        it('refuses more questions than the processor will render', async function () {
            const keys = [];
            for (const name of ['One', 'Two', 'Three', 'Four']) {
                keys.push((await createField({name})).key);
            }

            const body = await setCheckout({custom_fields: keys.map(key => ({key}))}, 422);
            assert.match(body.errors[0].context, /at most 3 questions/);
        });

        // A publisher can name a field something no processor will render as a label, so
        // the label exists to be shorter than the name.
        it('refuses a question the processor could not label', async function () {
            const long = await createField({name: `Tell us ${'x'.repeat(60)}`});

            const body = await setCheckout({custom_fields: [{key: long.key}]}, 422);
            assert.match(body.errors[0].context, /at most 50 characters/);

            await setCheckout({custom_fields: [{key: long.key, label: 'Tell us more'}]});
            assert.equal((await readCheckout()).custom_fields[0].label, 'Tell us more');
        });

        it('refuses a field type the processor cannot ask for', async function () {
            // Named so its key is not one of the things this checkout collects for itself,
            // which is refused earlier and for a different reason.
            const address = await createField({name: 'Postal address', type: 'address'});

            const body = await setCheckout({custom_fields: [{key: address.key}]}, 422);
            assert.match(body.errors[0].context, /cannot be asked for at checkout/);
        });

        it('refuses the same field twice', async function () {
            const size = await createField({name: 'T-shirt size'});

            const body = await setCheckout({custom_fields: [{key: size.key}, {key: size.key}]}, 422);
            assert.match(body.errors[0].context, /already asks/);
        });

        // Otherwise the same field is asked for twice on one page: once as a question, and
        // once as whatever the source collects on its own.
        it('refuses a field something already collects into', async function () {
            const field = await createField({name: 'VAT number'});
            await setCheckout({tax_number: {collect: true, custom_field_key: field.key}});

            const body = await setCheckout({custom_fields: [{key: field.key}]}, 422);
            assert.match(body.errors[0].context, /already collected automatically/);
        });

        it('refuses a field the site does not have', async function () {
            const body = await setCheckout({custom_fields: [{key: 'no_such_field'}]}, 422);
            assert.match(body.errors[0].context, /Unknown custom field/);
        });
    });

    describe('What the checkout collects for itself', function () {
        // Collecting and choosing where it lands are one statement, because a publisher
        // makes them as one choice: a checkbox and the field beside it.
        it('collects a port and binds its destination in one write', async function () {
            await createField({name: 'Delivery address', type: 'address'});

            await setCheckout(shipping({allowed_countries: ['GB', 'ie']}));
            assert.deepEqual((await readCheckout()).shipping, {
                collect: true,
                // Uppercased on the way in, so one country is one value.
                allowed_countries: ['GB', 'IE'],
                name: {custom_field_key: null},
                address: {custom_field_key: 'delivery_address'}
            });
        });

        // Asking a member for something with nowhere to put it wastes their time.
        it('refuses to collect without saying where it goes', async function () {
            await createField({name: 'Delivery address', type: 'address'});

            const body = await setCheckout({shipping: {collect: true, allowed_countries: ['GB']}}, 422);
            assert.match(body.errors[0].context, /Choose where the shipping address should be kept/);
        });

        // The destination is site-wide, so it is one answer however many tiers collect it.
it('reports the destination against the thing collected', async function () {
            await createField({name: 'Delivery address', type: 'address'});
            await setCheckout(shipping());

            assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
        });

        // An address form cannot be rendered without a country list. Stripe's reference
        // calls it optional, but an empty collection object form-encodes to nothing, so a
        // request built that way never asks Stripe to collect anything at all.
        it('refuses to collect an address without countries to collect it in', async function () {
            await createField({name: 'Delivery address', type: 'address'});

            const body = await setCheckout(shipping({allowed_countries: undefined}), 422);
            assert.match(body.errors[0].context, /at least one country/);
        });

        it('refuses a country code that is not one', async function () {
            await createField({name: 'Delivery address', type: 'address'});

            const body = await setCheckout(shipping({allowed_countries: ['IRL']}), 422);
            assert.match(body.errors[0].context, /2-letter country code/);
        });

        it('refuses a destination whose type is not what the port supplies', async function () {
            await createField({name: 'Delivery notes', type: 'short_text'});

            const body = await setCheckout(shipping({address: {custom_field_key: 'delivery_notes'}}), 422);
            assert.match(body.errors[0].context, /address field/);
        });

// Which kinds of thing exist is the request schema's to state, so naming one that
        // does not is a malformed body rather than a lookup that came back empty.
        it('refuses a kind of thing nothing can collect', async function () {
            await createField({name: 'Delivery address', type: 'address'});
            await setCheckout({inside_leg: {collect: true, custom_field_key: 'delivery_address'}}, 422);
        });
    });

    describe('Naming one list and not the other', function () {
        // A client that knows about the questions must not erase the collection by staying
        // silent about it.
        it('leaves a list the request does not name alone', async function () {
            const size = await createField({name: 'T-shirt size'});
            await createField({name: 'Delivery address', type: 'address'});

            await setCheckout({custom_fields: [{key: size.key}]});
            await setCheckout(shipping());

            const config = await readCheckout();
            assert.deepEqual(config.custom_fields.map((question: {key: string}) => question.key), ['t_shirt_size']);
            assert.deepEqual(config.shipping, {
                collect: true,
                allowed_countries: ['GB'],
                name: {custom_field_key: null},
                address: {custom_field_key: 'delivery_address'}
            });
        });

        // Every collectable thing shares one row, so leaving one alone is a property of
        // the write rather than of the storage.
        it('leaves a collectable thing the request does not name alone', async function () {
            await createField({name: 'Delivery address', type: 'address'});
            const vat = await createField({name: 'VAT number'});

            await setCheckout(shipping());
            await setCheckout({tax_number: {collect: true, custom_field_key: vat.key}});

            const config = await readCheckout();
            assert.equal(config.shipping.collect, true);
            assert.deepEqual(config.shipping.allowed_countries, ['GB']);
            assert.equal(config.tax_number.collect, true);
        });

        // Turning collection off takes the countries with it, so turning it back on cannot
        // quietly resume delivering somewhere the publisher has since stopped delivering.
        it('forgets where a publisher delivered once they stop collecting', async function () {
            await createField({name: 'Delivery address', type: 'address'});

            await setCheckout(shipping());
            await setCheckout({shipping: {collect: false}});
            assert.equal((await readCheckout()).shipping, undefined);

            const body = await setCheckout({shipping: {collect: true, address: {custom_field_key: 'delivery_address'}}}, 422);
            assert.match(body.errors[0].context, /at least one country/);
        });
    });

    describe('When a field stops being usable', function () {
        // Refused at write, tolerated at read. Archiving is reversible, so the question
        // waits for the field to come back rather than being torn out.
        it('keeps a question whose field was archived', async function () {
            const size = await createField({name: 'T-shirt size'});
            await setCheckout({custom_fields: [{key: size.key}]});

            await setStatus(size.key, 'archived');
            assert.deepEqual((await readCheckout()).custom_fields.map((question: {key: string}) => question.key), ['t_shirt_size']);

            await setStatus(size.key, 'active');
            assert.deepEqual((await readCheckout()).custom_fields.map((question: {key: string}) => question.key), ['t_shirt_size']);
        });

        // Deleting is irreversible and already gated behind archiving, so the question goes
        // with the field rather than pointing at nothing.
        it('drops a question whose field was permanently deleted', async function () {
            const size = await createField({name: 'T-shirt size'});
            await setCheckout({custom_fields: [{key: size.key}]});

            await setStatus(size.key, 'archived');
            await agent.delete(`members/custom_fields/${size.key}/`).expectStatus(204);

            assert.deepEqual((await readCheckout()).custom_fields, []);
        });
    });

    describe('Browsing every tier', function () {
        it('returns the tiers that ask for something, so a list needs one request', async function () {
            const size = await createField({name: 'T-shirt size'});
            await setCheckout({custom_fields: [{key: size.key}]});

            const {body} = await agent.get('tiers/checkout_config/').expectStatus(200);
            assert.deepEqual(body.tiers_checkout_config, [{
                tier_id: tierId,
                custom_fields: [{key: 't_shirt_size', label: null, optional: true}]
            }]);
        });

        // Turning collection off leaves the row behind with every flag false, so "has a
        // configuration row" is not the same question as "configured something".
        it('leaves out a tier that turned everything back off', async function () {
            await createField({name: 'Delivery address', type: 'address'});
            await setCheckout(shipping());
            await setCheckout({shipping: {collect: false}});

            const {body} = await agent.get('tiers/checkout_config/').expectStatus(200);
            assert.deepEqual(body.tiers_checkout_config, []);
        });
    });

    // The payoff for keeping both relations keyed on the same field: one question, asked
    // once, answered across two tables that were deliberately not merged into one.
    describe('What depends on a field', function () {
        it('says nothing depends on a field nothing depends on', async function () {
            const size = await createField({name: 'T-shirt size'});

            const {body} = await agent.get(`members/custom_fields/${size.key}/?include=bindings,tiers`).expectStatus(200);
            assert.deepEqual(body.members_custom_fields[0].bindings, []);
            assert.deepEqual(body.members_custom_fields[0].tiers, []);
        });

        it('names the tiers that ask for it and the ports that write into it', async function () {
            const size = await createField({name: 'T-shirt size'});
            await createField({name: 'Delivery address', type: 'address'});
            await setCheckout({custom_fields: [{key: size.key}], ...shipping()});

            const {body} = await agent.get('members/custom_fields/?include=bindings,tiers').expectStatus(200);
            const byKey = Object.fromEntries(body.members_custom_fields.map(
                (field: {key: string}) => [field.key, field]
            ));

            assert.deepEqual(byKey.t_shirt_size.tiers, [{id: tierId, name: 'Default Product'}]);
            // A question is a binding too, so what writes into a field now includes the
            // question that asks for it — which is the point of routing both the same way.
            assert.deepEqual(byKey.t_shirt_size.bindings, [{port: 't_shirt_size'}]);
            assert.deepEqual(byKey.delivery_address.bindings, [{port: 'shipping_address'}]);
            // Both routes are bindings, so a tier that collects into a field depends on it
            // just as much as one that asks for it — which is what a settings screen needs
            // to know before it lets a publisher archive the field.
            assert.deepEqual(byKey.delivery_address.tiers, [{id: tierId, name: 'Default Product'}]);
        });
        // A relation nobody asked for is absent rather than empty, so a caller can tell
        // "not requested" from "nothing depends on this".
        it('says nothing about a relation unless asked', async function () {
            const size = await createField({name: 'T-shirt size'});
            await setCheckout({custom_fields: [{key: size.key}]});

            const {body} = await agent.get(`members/custom_fields/${size.key}/`).expectStatus(200);
            assert.equal('bindings' in body.members_custom_fields[0], false);
            assert.equal('tiers' in body.members_custom_fields[0], false);
        });

        // One relation asked for must not drag the other in.
        it('loads only the relation that was asked for', async function () {
            const size = await createField({name: 'T-shirt size'});
            await setCheckout({custom_fields: [{key: size.key}]});

            const {body} = await agent.get(`members/custom_fields/${size.key}/?include=tiers`).expectStatus(200);
            assert.deepEqual(body.members_custom_fields[0].tiers, [{id: tierId, name: 'Default Product'}]);
            assert.equal('bindings' in body.members_custom_fields[0], false);
        });
    });

    // The litmus test for the data model: if someone administers this with plain SQL, what
    // states can they reach, and does anything break when they do. Each of these reaches a
    // state the API refuses to create, and asserts the system stays sane in it.
    describe('When the database is edited by hand', function () {
        async function collectShipping() {
            await createField({name: 'Delivery address', type: 'address'});
            await setCheckout(shipping());
        }

        it('collects nothing when the binding is deleted out from under a tier', async function () {
            await collectShipping();
            await models.Base.knex('members_custom_field_bindings').del();

            // The tier still says it collects, and says it is kept nowhere. Nothing is asked
            // for at checkout, which is what having nowhere to put it should cost.
            const config = await readCheckout();
            assert.equal(config.shipping.collect, true);
            assert.equal(config.shipping.address.custom_field_key, null);
        });

        it('leaves a binding behind when a tier stops collecting, and reuses it', async function () {
            await collectShipping();
            await models.Base.knex('products_checkout_config').update({shipping_collect: false});

            // The binding is site-wide, so it outlives any one tier turning collection off.
            // Turning it back on finds the same destination rather than asking again.
            await setCheckout(shipping());
            assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
        });

        it('takes the binding with the field when a definition is deleted', async function () {
            await collectShipping();
            // Deleting takes archiving first, which is the API's own rule; the cascade below
            // is the database's, and it is what a hand-written DELETE would hit too.
            await setStatus('delivery_address', 'archived');
            await agent.delete('members/custom_fields/delivery_address/').expectStatus(204);

            // Cascade, so no binding can name a field that is gone.
            const bindings = await models.Base.knex('members_custom_field_bindings').select();
            assert.deepEqual(bindings, []);
            assert.equal((await readCheckout()).shipping.address.custom_field_key, null);
        });

        it('keeps the binding when a definition is archived, and resumes on restore', async function () {
            await collectShipping();
            await setStatus('delivery_address', 'archived');

            // Archiving is reversible, so the binding waits rather than being torn out.
            const [binding] = await models.Base.knex('members_custom_field_bindings').select();
            assert.equal(binding.custom_field_key, 'delivery_address');

            await setStatus('delivery_address', 'active');
            assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
        });
    });

    // A binding is site-wide by design: one destination per writer-port, so every tier that
    // collects an address writes into the same field. Whether to collect is per tier. These
    // two facts meet when one tier turns collection off while another still wants it.
    describe('Two tiers, one destination', function () {
        it('leaves another tier collecting when this one stops', async function () {
            await createField({name: 'Delivery address', type: 'address'});

            // Copied from the tier the suite already has, because what is being tested is
            // what happens between two of them rather than how one is made.
            const [existing] = await models.Base.knex('products').where('id', tierId);
            const secondId = 'ffffffffffffffffffffffff';
            await models.Base.knex('products').insert({
                ...existing,
                id: secondId,
                name: 'Digital',
                slug: 'digital-second'
            });

            await setCheckout(shipping());

            // The digital tier does not ship anything, so a publisher turns it off there.
            await agent
                .put(`tiers/${secondId}/checkout_config/`)
                .body({tiers_checkout_config: [{shipping: {collect: false}}]})
                .expectStatus(200);

            // The print tier never changed, so it must still be collecting into its field.
            const config = await readCheckout();
            assert.equal(config.shipping.collect, true);
            assert.equal(config.shipping.address.custom_field_key, 'delivery_address');
        });

        // The other half of the same rule: kept while wanted, gone once nothing wants it.
        // Without this, "never unbind" would pass the test above and leave a destination
        // no publisher can see behind a toggle they have turned off.
        it('removes the destination once no tier wants it', async function () {
            await createField({name: 'Delivery address', type: 'address'});
            await setCheckout(shipping());

            await setCheckout({shipping: {collect: false}});

            assert.deepEqual(await models.Base.knex('members_custom_field_bindings').select(), []);
        });
    });

    describe('Flag', function () {
        it('is unreachable with the flag off', async function () {
            mockManager.mockLabsDisabled('membersCustomFields');
            await agent.get(`tiers/${tierId}/checkout_config/`).expectStatus(404);
        });

        // The tier resource is generally available, so this concept must not appear on it.
        it('adds nothing to the tier itself', async function () {
            const {body} = await agent.get(`tiers/${tierId}/`).expectStatus(200);
            assert.equal(body.tiers[0].checkout, undefined);
        });
    });
});
