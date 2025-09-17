/**
 * Demonstration test showing new Mirage JS patterns
 *
 * This file showcases how to use the new Mirage setup for testing
 * and can serve as a reference for migrating existing tests.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { server } from './test-setup';
import { scenarios, setupServerState } from './test-helpers';

describe('Mirage JS Demo - New Testing Patterns', () => {
    test('should create a basic site with Mirage factory', () => {
        const site = server.create('site');

        expect(site.title).toBe('The Blueprint');
        expect(site.accent_color).toBe('#45C32E');
        expect(site.portal_button).toBe(true);
    });

    test('should create site with traits', () => {
        const site = server.create('site', 'withoutName', 'paidMembersOnly');

        expect(site.portal_name).toBe(false);
        expect(site.members_signup_access).toBe('paid');
    });

    test('should create members with different types', () => {
        const freeMember = server.create('member', 'free');
        const paidMember = server.create('member', 'paid');

        expect(freeMember.paid).toBe(false);
        expect(freeMember.status).toBe('free');

        expect(paidMember.paid).toBe(true);
        expect(paidMember.status).toBe('paid');
        expect(paidMember.subscriptions.models).toHaveLength(1);
    });

    test('should create products with pricing', () => {
        const freeProduct = server.create('product', 'free');
        const bronzeProduct = server.create('product', 'bronze');

        expect(freeProduct.type).toBe('free');
        expect(freeProduct.name).toBe('Free');

        expect(bronzeProduct.type).toBe('paid');
        expect(bronzeProduct.name).toBe('Bronze');
        expect(bronzeProduct.monthly_price.amount).toBe(700);
        expect(bronzeProduct.yearly_price.amount).toBe(7000);
    });

    test('should use scenario builders for complex setups', () => {
        const { site, member, products } = scenarios.freeMemberSingleTier(server);

        expect(site.title).toBe('The Blueprint');
        expect(member.paid).toBe(false);
        expect(products).toHaveLength(2); // free + paid product
        expect(products[0].type).toBe('free');
        expect(products[1].type).toBe('paid');
    });

    test('should handle multi-tier scenarios', () => {
        const { site, member, products } = scenarios.freeMemberMultiTier(server);

        expect(site.title).toBe('The Blueprint');
        expect(member.paid).toBe(false);
        expect(products).toHaveLength(4); // free + 3 paid tiers

        const productTypes = products.map(p => p.type);
        expect(productTypes).toContain('free');
        expect(productTypes.filter(t => t === 'paid')).toHaveLength(3);
    });

    test('should handle offer scenarios', () => {
        const { site, member, products, offer } = scenarios.offerScenario(server);

        expect(offer.display_title).toBe('Black Friday Special');
        expect(offer.type).toBe('percent');
        expect(offer.amount).toBe(20);
    });

    test('should use setupServerState with string scenario', () => {
        const { site, member } = setupServerState(server, 'paidMembersOnly');

        expect(site.members_signup_access).toBe('paid');
        expect(member.paid).toBe(false);
    });

    test('should handle dynamic API responses', () => {
        // Create test data
        const { site, member } = scenarios.freeMemberSingleTier(server);

        // The server should automatically respond to API calls
        return fetch('/members/api/site')
            .then(response => response.json())
            .then(data => {
                expect(data.title).toBe('The Blueprint');
                expect(data.accent_color).toBe('#45C32E');
            });
    });

    test('should handle member session endpoint', () => {
        const member = server.create('member', 'paid');

        return fetch('/members/api/member')
            .then(response => response.json())
            .then(data => {
                expect(data.name).toBe('Jamie Larson');
                expect(data.paid).toBe(true);
            });
    });

    test('should mock magic link sending', () => {
        return fetch('/members/api/send-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                emailType: 'signup'
            })
        })
        .then(response => response.text())
        .then(result => {
            expect(result).toBe('Success');
        });
    });

    test('should handle offer endpoints', () => {
        const product = server.create('product', 'bronze');
        const offer = server.create('offer', {
            id: 'test-offer-123',
            display_title: 'Test Offer',
            tier: product
        });

        return fetch('/members/api/offers/test-offer-123')
            .then(response => response.json())
            .then(data => {
                expect(data.offers[0].display_title).toBe('Test Offer');
            });
    });
});

describe('Comparison: Old vs New Patterns', () => {
    test('OLD PATTERN: Manual Jest mocking (for reference)', async () => {
        // This is how tests currently work - lots of manual setup

        // Example of current manual setup (commented out to avoid conflicts)
        /*
        const ghostApi = setupGhostApi({siteUrl: 'https://example.com'});
        ghostApi.init = jest.fn(() => {
            return Promise.resolve({
                site: {
                    title: 'The Blueprint',
                    accent_color: '#45C32E',
                    // ... 50+ lines of manual data
                },
                member: {
                    name: 'Jamie Larson',
                    // ... manual member data
                }
            });
        });
        ghostApi.member.sendMagicLink = jest.fn(() => Promise.resolve('success'));
        ghostApi.member.getIntegrityToken = jest.fn(() => Promise.resolve('testtoken'));
        // ... many more manual mocks
        */
    });

    test('NEW PATTERN: Mirage scenarios (much cleaner!)', () => {
        // With Mirage, we get the same result with much less code
        const { site, member } = scenarios.freeMemberSingleTier(server);

        // Data is automatically available and realistic
        expect(site.title).toBe('The Blueprint');
        expect(site.accent_color).toBe('#45C32E');
        expect(member.name).toBe('Jamie Larson');

        // API endpoints work automatically
        // No need for manual jest.fn() mocking
        // Server responses are dynamic and realistic
    });
});