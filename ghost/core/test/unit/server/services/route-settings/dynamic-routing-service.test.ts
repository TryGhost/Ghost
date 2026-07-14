import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'vitest';

import parseYaml from '../../../../../core/server/services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import {InMemoryStore} from '../../adapters/route-settings/helpers/in-memory-store';

const DynamicRoutingService = require('../../../../../core/server/services/route-settings/dynamic-routing-service');
const bridge = require('../../../../../core/bridge');
const urlService = require('../../../../../core/server/services/url');

const fromYaml = (yaml: string) => parseRouteSettings(parseYaml(yaml), yaml);

const CUSTOM_YAML = `routes:
  /about/: about

collections:
  /:
    permalink: /{slug}/
    template: index

taxonomies:
  tag: /tag/{slug}/
`;

describe('UNIT: DynamicRoutingService (store-backed)', function () {
    let service: InstanceType<typeof DynamicRoutingService>;
    let store: InMemoryStore;

    beforeEach(function () {
        service = new DynamicRoutingService();
        store = new InMemoryStore();
        service.configure({store});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('get returns the verbatim yaml source from the store', async function () {
        await store.replace(fromYaml(CUSTOM_YAML));

        assert.equal(await service.get(), CUSTOM_YAML);
    });

    it('loadRouteSettings expands the domain model into the router format', async function () {
        await store.replace(fromYaml(CUSTOM_YAML));

        const expanded = await service.loadRouteSettings();

        assert.deepEqual(expanded.routes['/about/'], {templates: ['about']});
        assert.equal(expanded.collections['/'].permalink, '/:slug/');
        assert.equal(expanded.taxonomies.tag, '/tag/:slug/');
    });

    it('getCurrentHash over the bundled defaults matches the known default hash', async function () {
        const defaultYaml = await fs.readFile(
            path.join(__dirname, '../../../../../core/server/services/route-settings/default-routes.yaml'),
            'utf8'
        );
        await store.replace(fromYaml(defaultYaml));

        assert.equal(await service.getCurrentHash(), service.getDefaultHash());
    });

    it('getCurrentHash matches md5 of the stringified expansion', async function () {
        await store.replace(fromYaml(CUSTOM_YAML));

        const expected = crypto.createHash('md5')
            .update(JSON.stringify(await service.loadRouteSettings()), 'binary')
            .digest('hex');

        assert.equal(await service.getCurrentHash(), expected);
    });

    describe('setFromFilePath', function () {
        let uploadDir: string;

        const writeUpload = async (content: string): Promise<string> => {
            const filePath = path.join(uploadDir, 'routes-incoming.yaml');
            await fs.writeFile(filePath, content, 'utf8');
            return filePath;
        };

        beforeEach(async function () {
            uploadDir = path.join(os.tmpdir(), `route-settings-upload-${crypto.randomUUID()}`);
            await fs.ensureDir(uploadDir);
        });

        afterEach(async function () {
            await fs.remove(uploadDir);
        });

        it('persists the parsed upload through the store', async function () {
            sinon.stub(bridge, 'reloadFrontend').resolves();
            sinon.stub(urlService, 'resetGenerators');
            sinon.stub(urlService, 'hasFinished').returns(true);

            await service.setFromFilePath(await writeUpload(CUSTOM_YAML));

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
        });

        it('rejects an invalid upload before anything reaches the store', async function () {
            const reloadStub = sinon.stub(bridge, 'reloadFrontend').resolves();
            const previous = fromYaml(CUSTOM_YAML);
            await store.replace(previous);

            await assert.rejects(
                service.setFromFilePath(await writeUpload('routes:\n  no-slashes: about\n')),
                (err: {errorType?: string}) => {
                    assert.equal(err.errorType, 'ValidationError');
                    return true;
                }
            );

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
            assert.equal(reloadStub.called, false);
        });

        it('rolls the store back when the frontend reload fails', async function () {
            const reloadStub = sinon.stub(bridge, 'reloadFrontend');
            reloadStub.onFirstCall().rejects(new Error('YAMLException: bad indentation of a mapping entry'));
            reloadStub.onSecondCall().resolves();
            sinon.stub(urlService, 'resetGenerators');

            const previous = fromYaml(CUSTOM_YAML);
            await store.replace(previous);

            const nextYaml = CUSTOM_YAML.replace('/about/: about', '/contact/: contact');

            await assert.rejects(
                service.setFromFilePath(await writeUpload(nextYaml)),
                /YAMLException/
            );

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
            assert.equal(reloadStub.callCount, 2);
        });
    });
});
