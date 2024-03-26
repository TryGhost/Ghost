import {Integration} from './integration.entity';
// import {IntegrationRepository} from './integration.repository';
import {IntegrationService} from './integration.service';
import assert from 'assert';
import Sinon from 'sinon';

describe('IntegrationService', function () {
    it('Can create an integration', async function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });

        const repository = {
            getOne: Sinon.stub().resolves(entity),
            create: Sinon.stub().resolves(entity),
            update: Sinon.stub().resolves(entity),
            getAll: Sinon.stub().resolves([])
        };
        const service = new IntegrationService(repository);

        const created = await service.create(entity);

        assert.equal(created.slug, 'test-integration');
    });

    it('Can get one integration', async function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration'
        });

        const repository = {
            getOne: Sinon.stub().resolves(entity),
            create: Sinon.stub().resolves(entity),
            update: Sinon.stub().resolves(entity),
            getAll: Sinon.stub().resolves([])
        };
        const service = new IntegrationService(repository);

        const found = await service.getOne('test-integration');
        assert.equal(found.slug, 'test-integration');
    });

    it('Can update an integration', async function () {
        const entity = new Integration({
            type: 'internal',
            name: 'Test Integration',
            slug: 'test-integration',
            icon_image: 'https://example.com/icon.png',
            api_keys: [],
            description: 'A test integration',
            webhooks: []
        });

        const repository = {
            getOne: Sinon.stub().resolves(entity),
            create: Sinon.stub().resolves(entity),
            update: Sinon.stub().resolves(entity),
            getAll: Sinon.stub().resolves([])
        };

        const service = new IntegrationService(repository);

        entity.name = 'Updated Integration';

        const updated = await service.update(entity);

        assert.equal(updated.name, 'Updated Integration');
    });
});
