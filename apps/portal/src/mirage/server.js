import { createServer, Model, Factory, belongsTo, hasMany } from 'miragejs';
import {
    siteFactory,
    memberFactory,
    productFactory,
    priceFactory,
    subscriptionFactory,
    offerFactory,
    newsletterFactory,
} from './factories';

export function makeServer({ environment = 'test' } = {}) {
    return createServer({
        environment,

        models: {
            site: Model,
            member: Model,
            product: Model.extend({
                monthlyPrice: belongsTo('price'),
                yearlyPrice: belongsTo('price'),
            }),
            price: Model,
            subscription: Model,
            offer: Model,
            newsletter: Model,
        },

        factories: {
            site: siteFactory,
            member: memberFactory,
            product: productFactory,
            price: priceFactory,
            subscription: subscriptionFactory,
            offer: offerFactory,
            newsletter: newsletterFactory,
        },

        routes() {
            this.namespace = '/members/api';

            // Site endpoints
            this.get('/site', (schema) => {
                const site = schema.sites.first();
                return site ? site.attrs : {};
            });

            this.get('/member', (schema) => {
                const member = schema.members.first();
                return member ? member.attrs : null;
            });

            // Member authentication endpoints
            this.post('/send-magic-link', () => {
                return 'Success';
            });

            this.get('/integrity-token', () => {
                return 'testtoken';
            });

            // Checkout endpoints
            this.post('/create-stripe-checkout-session', () => {
                return {
                    sessionId: 'test_session_id',
                    publicKey: 'test_public_key'
                };
            });

            // Session endpoints
            this.get('/session', () => {
                return 'test_identity_token';
            });

            this.delete('/session', () => {
                return { success: true };
            });

            // Content API endpoints (for offers, newsletters, etc.)
            this.get('/offers/:id', (schema, request) => {
                const offer = schema.offers.find(request.params.id);
                return offer ? { offers: [offer.attrs] } : new Response(404);
            });

            // Passthrough for any unhandled requests in development
            if (environment === 'development') {
                this.passthrough();
            }
        },
    });
}