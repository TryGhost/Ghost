import assert from 'node:assert/strict';
import path from 'path';

import { globSync } from 'glob';
import { services } from '../../utils/services';

const {
  withServices,
}: typeof import('../../../core/server/api/endpoints/utils/define-endpoints') = require('../../../core/server/api/endpoints/utils/define-endpoints');

describe('API', function () {
  describe('Cache Invalidation', function () {
    it('Controller actions explicitly declare cacheInvalidate header', async function () {
      const controllersRootPath = path.join(__dirname, '../../../core/server/api/endpoints');
      const controllerPaths = globSync('*.js', {
        cwd: controllersRootPath,
        ignore: [
          'index.js',
          'identities.js', // The identities controller can not be required directly due to requiring other parts of Ghost to have been initialised first
        ],
        absolute: true,
      });

      assert.ok(controllerPaths.length > 0, `No controllers found in ${controllersRootPath}`);

      controllerPaths.forEach((controllerPath) => {
        // A module that is handed its services exports how to build its controller.
        const controllerConfig = withServices(services, require(controllerPath)) as Record<
          string,
          { headers?: { cacheInvalidate?: unknown } } | undefined
        >;
        const ignoreKeys = ['docName'];

        Object.keys(controllerConfig).forEach((key) => {
          if (ignoreKeys.includes(key) || typeof controllerConfig[key] === 'function') {
            return;
          }

          assert.notEqual(
            controllerConfig[key]?.headers?.cacheInvalidate,
            undefined,
            `"${key}" action in controller: ${controllerPath} is missing cacheInvalidate header - This needs to be explicitly defined`,
          );
        });
      });
    });
  });
});
