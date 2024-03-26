import {Integration} from './integration.entity';
import assert from 'assert';

describe('IntegrationEntity', function () {
    it('Can be created', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration',
            webhooks: []
        });
        assert.equal(entity.type, 'internal');
        assert.equal(entity.name, 'Test Integration');
        assert.equal(entity.slug, 'test-integration');
        assert.equal(entity.icon_image, 'https://example.com/icon.png');
        assert.equal(entity.description, 'A test integration');
    });
    it('Can have its name updated', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        entity.name = 'Updated Integration';
        assert.equal(entity.name, 'Updated Integration');
    });
    it('Can have its icon updated', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        entity.icon_image = 'https://example.com/updated-icon.png';
        assert.equal(entity.icon_image, 'https://example.com/updated-icon.png');
    });
    it('Can have its description updated', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        entity.description = 'An updated test integration';
        assert.equal(entity.description, 'An updated test integration');
    });
    it('Can have its type updated', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        entity.type = 'custom';
        assert.equal(entity.type, 'custom');
    });
    it('Can have its slug updated', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        entity.slug = 'updated-integration';
        assert.equal(entity.slug, 'updated-integration');
    });

    it('Can have its api_keys updated', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        const apiKeys = [
            {
                id: '1',
                type: 'admin',
                secret: 'secret',
                integration_id: '1',
                created_at: '2021-01-01',
                updated_at: '2021-01-01',
                role_id: '1',
                user_id: '1',
                last_seen_at: '2021-01-01',
                last_seen_version: '1'
            }
        ];
        entity.api_keys = apiKeys;
    });

    it('sets icon image to null if not provided', function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            api_keys: [],
            description: 'A test integration',
            icon_image: null
        });
        assert.equal(entity.icon_image, null);
    });

    it('can return api keys', function (){
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [
                {
                    id: '1',
                    type: 'admin',
                    secret: 'secret',
                    integration_id: '1',
                    created_at: '2021-01-01',
                    updated_at: '2021-01-01',
                    role_id: '1',
                    user_id: '1',
                    last_seen_at: '2021-01-01',
                    last_seen_version: '1'
                }
            ],
            description: 'A test integration'
        });
        assert.equal(entity.api_keys.length, 1);
    });

    it('can return webhooks', function (){
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration',
            webhooks: [
                {
                    id: '1',
                    event: 'site.changed',
                    target_url: 'https://example.com/target',
                    name: 'sup',
                    secret: 'https://example.com/secret',
                    api_version: 'v5.81',
                    integration_id: '1',
                    last_triggered_at: null,
                    last_triggered_status: null,
                    last_triggered_error: null,
                    created_at: '2021-01-01',
                    updated_at: '2021-01-01'
                }
            ]
        });
        assert.equal(entity.webhooks.length, 1);
    });

    it ('can set webhooks', function (){
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        const webhooks = [
            {
                id: '1',
                event: 'site.changed',
                target_url: 'https://example.com/target',
                name: 'sup',
                secret: 'https://example.com/secret',
                api_version: 'v5.81',
                integration_id: '1',
                last_triggered_at: null,
                last_triggered_status: null,
                last_triggered_error: null,
                created_at: '2021-01-01',
                updated_at: '2021-01-01'
            }
        ];
        entity.webhooks = webhooks;
        assert.equal(entity.webhooks.length, 1);
    });
    it('returns empty array if no webhooks are provided', function (){
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });
        assert.equal(entity.webhooks.length, 0);
    });
});