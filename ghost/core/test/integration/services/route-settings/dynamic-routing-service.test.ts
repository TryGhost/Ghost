import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import {afterEach, beforeEach, describe, it} from 'vitest';

import FileStore from '../../../../core/server/adapters/route-settings/FileStore';

const DynamicRoutingService = require('../../../../core/server/services/route-settings/dynamic-routing-service');
const logging = require('@tryghost/logging');

// FileStore serves the bundled defaults from this folder when no routes.yaml
// exists; the tests always write their own file, so it's only needed to satisfy
// the constructor.
const DEFAULT_SETTINGS_BASE_PATH = path.join(__dirname, '../../../../core/server/services/route-settings');

const VALID_YAML = `routes:
  /about/: about

collections:
  /:
    permalink: /{slug}/
    template: index

taxonomies:
  tag: /tag/{slug}/
`;

// A `read` data entry without a slug — the kind of legacy-shaped file that the
// strict parser rejects with a ValidationError.
const INVALID_YAML = `routes:
  /featured/:
    template: featured
    data:
      my-post:
        resource: posts
        type: read

collections:
  /:
    permalink: /{slug}/
    template: index

taxonomies:
  tag: /tag/{slug}/
`;

// Broken YAML syntax — the parser rejects this with an IncorrectUsageError.
const MALFORMED_YAML = 'routes:\n  bad: [unclosed\n';

describe('Integration: DynamicRoutingService over a real FileStore', function () {
    let contentDir: string;
    let service: InstanceType<typeof DynamicRoutingService>;

    beforeEach(async function () {
        contentDir = path.join(os.tmpdir(), `route-settings-integration-${crypto.randomUUID()}`);
        await fs.ensureDir(contentDir);

        service = new DynamicRoutingService();
        service.configure({store: new FileStore({basePath: contentDir, defaultSettingsBasePath: DEFAULT_SETTINGS_BASE_PATH})});
    });

    afterEach(async function () {
        sinon.restore();
        await fs.remove(contentDir);
    });

    const writeRoutes = (yaml: string) => fs.writeFile(path.join(contentDir, 'routes.yaml'), yaml, 'utf8');

    it('loadRouteSettings expands a valid stored file into the router format', async function () {
        await writeRoutes(VALID_YAML);

        const expanded = await service.loadRouteSettings();

        assert.deepEqual(expanded.routes['/about/'], {templates: ['about']});
        assert.equal(expanded.collections['/'].permalink, '/:slug/');
        assert.equal(expanded.taxonomies.tag, '/tag/:slug/');
    });

    it('loadRouteSettings logs ROUTE_SETTINGS_VALIDATION_ERROR and rethrows when the file fails validation', async function () {
        const errorStub = sinon.stub(logging, 'error');
        await writeRoutes(INVALID_YAML);

        await assert.rejects(service.loadRouteSettings(), (err: {errorType?: string}) => {
            assert.equal(err.errorType, 'ValidationError');
            return true;
        });

        assert.ok(errorStub.calledOnce);
        assert.equal(errorStub.firstCall.args[0].code, 'ROUTE_SETTINGS_VALIDATION_ERROR');
    });

    it('loadRouteSettings logs ROUTE_SETTINGS_VALIDATION_ERROR and rethrows when the file is not parseable yaml', async function () {
        const errorStub = sinon.stub(logging, 'error');
        await writeRoutes(MALFORMED_YAML);

        await assert.rejects(service.loadRouteSettings(), (err: {errorType?: string}) => {
            assert.equal(err.errorType, 'IncorrectUsageError');
            return true;
        });

        assert.ok(errorStub.calledOnce);
        assert.equal(errorStub.firstCall.args[0].code, 'ROUTE_SETTINGS_VALIDATION_ERROR');
    });

    it('download returns the verbatim yaml source from the store', async function () {
        await writeRoutes(VALID_YAML);

        assert.equal(await service.download(), VALID_YAML);
    });

    it('download rejects instead of returning a raw file when the stored file is invalid', async function () {
        await writeRoutes(INVALID_YAML);

        await assert.rejects(service.download(), (err: {errorType?: string}) => {
            assert.equal(err.errorType, 'ValidationError');
            return true;
        });
    });

    it('getCurrentHash over the bundled defaults matches the known default hash', async function () {
        const defaultYaml = await fs.readFile(path.join(DEFAULT_SETTINGS_BASE_PATH, 'default-routes.yaml'), 'utf8');
        await writeRoutes(defaultYaml);

        assert.equal(await service.getCurrentHash(), service.getDefaultHash());
    });
});
