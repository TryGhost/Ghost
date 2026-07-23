import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'vitest';

import parseYaml from '../../../../../core/server/services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../../../../core/server/services/route-settings/route-settings-parser';
import {InMemoryStore} from '../../adapters/route-settings/helpers/in-memory-store';

const DynamicRoutingService = require('../../../../../core/server/services/route-settings/dynamic-routing-service');
const bridge = require('../../../../../core/bridge');
const urlService = require('../../../../../core/server/services/url');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

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

    it('download returns the verbatim yaml source from the store', async function () {
        await store.replace(fromYaml(CUSTOM_YAML));

        assert.equal(await service.download(), CUSTOM_YAML);
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

    describe('loadRouteSettings validation failure', function () {
        it('logs a targeted validation error and rethrows when the store rejects the file', async function () {
            const errorStub = sinon.stub(logging, 'error');
            const parseError = new errors.ValidationError({message: 'slug is required for read data entries.'});
            sinon.stub(store, 'get').rejects(parseError);

            await assert.rejects(service.loadRouteSettings(), (err: Error) => {
                assert.equal(err, parseError, 'the original validation error is rethrown unchanged');
                return true;
            });

            assert.ok(errorStub.calledOnce);
            const reported = errorStub.firstCall.args[0];
            assert.equal(reported.code, 'ROUTE_SETTINGS_VALIDATION_ERROR');
            assert.equal(reported.errorDetails.reason, 'slug is required for read data entries.');
        });

        it('rethrows non-validation errors without logging a validation error', async function () {
            const errorStub = sinon.stub(logging, 'error');
            sinon.stub(store, 'get').rejects(new errors.InternalServerError({message: 'Error trying to access settings files in /content/settings.'}));

            await assert.rejects(service.loadRouteSettings(), /Error trying to access settings files/);
            assert.equal(errorStub.called, false);
        });

        it('does not log when the store parser succeeds', async function () {
            const errorStub = sinon.stub(logging, 'error');
            await store.replace(fromYaml(CUSTOM_YAML));

            const settings = await service.loadRouteSettings();

            assert.deepEqual(settings.routes['/about/'], {templates: ['about']});
            assert.equal(errorStub.called, false);
        });
    });

    describe('download', function () {
        it('rejects when the stored file is invalid rather than falling back to a raw read', async function () {
            const parseError = new errors.ValidationError({message: 'slug is required for read data entries.'});
            sinon.stub(store, 'get').rejects(parseError);

            await assert.rejects(service.download(), (err: Error) => {
                assert.equal(err, parseError);
                return true;
            });
        });
    });

    describe('upload', function () {
        it('persists the parsed upload through the store', async function () {
            sinon.stub(bridge, 'reloadFrontend').resolves();
            sinon.stub(urlService, 'resetGenerators');
            sinon.stub(urlService, 'hasFinished').returns(true);

            await service.upload(CUSTOM_YAML);

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
        });

        it('rejects an invalid upload before anything reaches the store', async function () {
            const reloadStub = sinon.stub(bridge, 'reloadFrontend').resolves();
            await store.replace(fromYaml(CUSTOM_YAML));

            await assert.rejects(
                service.upload('routes:\n  no-slashes: about\n'),
                (err: {errorType?: string}) => {
                    assert.equal(err.errorType, 'ValidationError');
                    return true;
                }
            );

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
            assert.equal(reloadStub.called, false);
        });

        it('accepts a valid upload when the current file is syntactically corrupt yaml', async function () {
            sinon.stub(bridge, 'reloadFrontend').resolves();
            sinon.stub(urlService, 'resetGenerators');
            sinon.stub(urlService, 'hasFinished').returns(true);

            const getStub = sinon.stub(store, 'get');
            getStub.onFirstCall().rejects(new errors.IncorrectUsageError({message: 'Could not parse provided YAML file: bad indentation of a mapping entry.'}));
            getStub.callThrough();

            await service.upload(CUSTOM_YAML);

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
        });

        it('accepts a valid upload when the current stored file fails validation', async function () {
            sinon.stub(bridge, 'reloadFrontend').resolves();
            sinon.stub(urlService, 'resetGenerators');
            sinon.stub(urlService, 'hasFinished').returns(true);

            const getStub = sinon.stub(store, 'get');
            getStub.onFirstCall().rejects(new errors.ValidationError({message: 'slug is required for read data entries.'}));
            getStub.callThrough();

            await service.upload(CUSTOM_YAML);

            assert.equal((await store.get()).yamlSource, CUSTOM_YAML);
        });

        it('surfaces a frontend reload failure without rolling back the store', async function () {
            const reloadStub = sinon.stub(bridge, 'reloadFrontend');
            reloadStub.rejects(new Error('YAMLException: bad indentation of a mapping entry'));
            sinon.stub(urlService, 'resetGenerators');

            await store.replace(fromYaml(CUSTOM_YAML));

            const nextYaml = CUSTOM_YAML.replace('/about/: about', '/contact/: contact');

            await assert.rejects(
                service.upload(nextYaml),
                /YAMLException/
            );

            assert.equal((await store.get()).yamlSource, nextYaml);
            assert.equal(reloadStub.callCount, 1);
        });
    });
});
