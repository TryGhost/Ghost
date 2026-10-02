import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { AdapterManager } from '../../../../../core/server/services/adapter-manager/adapter-manager';
const configUtils = require('../../../../utils/config-utils');
const { UpgradeBase } = require('@tryghost/adapter-base-upgrade');

// The Docker implementation remains in its own repository. CI/operators opt in
// by supplying that checkout's adapter directory; no copied fixture can drift.
const externalPath = process.env.GHOST_UPGRADE_ADAPTER_PATH;

(externalPath ? describe : describe.skip)(
  'external upgrade adapter with a real file exchange',
  () => {
    let root: string;

    afterEach(async () => {
      await configUtils.restore();
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('loads built CommonJS imports, normalizes options, and boots without the supervisor', async () => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-upgrade-'));
      const adapterPath = path.join(root, 'content/adapters/upgrade/FileDropUpgradeAdapter');
      fs.cpSync(externalPath!, adapterPath, { recursive: true });
      const base = path.dirname(path.dirname(require.resolve('@tryghost/adapter-base-upgrade')));
      fs.mkdirSync(path.join(root, 'node_modules/@tryghost'), { recursive: true });
      fs.symlinkSync(base, path.join(root, 'node_modules/@tryghost/adapter-base-upgrade'));

      // Plain Node without tsx or --conditions=source proves the production export,
      // starting resolution from the same content/adapters layout as the image.
      execFileSync(
        process.execPath,
        [
          '-e',
          `const {createRequire}=require('node:module'); const r=createRequire(${JSON.stringify(path.join(adapterPath, 'index.js'))}); const {UpgradeBase}=r('@tryghost/adapter-base-upgrade'); const Adapter=r('./index.js'); require('node:assert/strict').ok(new Adapter() instanceof UpgradeBase); require('node:assert/strict').match(r.resolve('@tryghost/adapter-base-upgrade'), /build/);`,
        ],
        { env: { ...process.env, NODE_OPTIONS: '' } },
      );

      const requestsPath = path.join(root, 'exchange/requests');
      const publicPath = path.join(root, 'exchange/public');
      configUtils.set('adapters:upgrade', {
        active: 'FileDropUpgradeAdapter',
        FileDropUpgradeAdapter: { requestsPath, publicPath },
      });
      const manager = new AdapterManager({
        baseClasses: { upgrade: UpgradeBase },
        config: configUtils.config,
        loadAdapterFromPath: require,
        pathsToAdapters: [path.join(root, 'content/adapters')],
      });

      manager.init();
      const adapter = manager.getAdapter('upgrade');
      assert.ok(adapter instanceof UpgradeBase);
      assert.deepEqual(await adapter.getStatus(), {
        supported: true,
        availability: 'unavailable',
        backupRequired: true,
      });

      fs.mkdirSync(requestsPath, { recursive: true });
      fs.mkdirSync(path.join(publicPath, 'jobs'), { recursive: true });
      fs.writeFileSync(
        path.join(publicPath, 'status.json'),
        JSON.stringify({
          protocol: 1,
          supported: true,
          heartbeatAt: new Date().toISOString(),
          currentVersion: '6.64.0',
          targets: [{ version: '6.65.0', image: `sha256:${'a'.repeat(64)}` }],
          backupRequired: true,
          activeJobId: null,
          pollAfterMs: 2000,
        }),
      );

      const input = { targetVersion: '6.65.0', idempotencyKey: 'a'.repeat(64) };
      const jobs = await Promise.all(Array.from({ length: 5 }, () => adapter.createRequest(input)));
      const job = jobs[0];
      assert.ok(jobs.every((result) => result.id === job.id));
      await assert.rejects(adapter.createRequest({ ...input, targetVersion: '6.66.0' }), {
        code: 'idempotency-conflict',
      });
      assert.equal(job.state, 'queued');
      assert.deepEqual(await adapter.getJob(job.id), job);
      assert.deepEqual(
        Object.keys(
          JSON.parse(fs.readFileSync(path.join(requestsPath, `${job.id}.json`), 'utf8')),
        ).sort(),
        ['createdAt', 'id', 'protocol', 'targetVersion'],
      );

      const done = { ...job, state: 'done', updatedAt: new Date().toISOString() };
      fs.writeFileSync(
        path.join(publicPath, 'jobs', `${job.id}.json`),
        JSON.stringify({ protocol: 1, ...done }),
      );
      assert.deepEqual(await adapter.getJob(job.id), done);

      fs.unlinkSync(path.join(requestsPath, `${job.id}.json`));
      fs.unlinkSync(path.join(publicPath, 'status.json'));
      manager.clearCache();
      assert.deepEqual(await manager.getAdapter('upgrade').createRequest(input), done);

      // A committed intent without a queued file is recovered after a crash.
      const interruptedId = 'd76543a0-c052-45e8-b020-03c86a809b93';
      const interrupted = {
        protocol: 1,
        id: interruptedId,
        targetVersion: '6.65.0',
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(requestsPath, '.idempotency', `${'b'.repeat(64)}.json`),
        JSON.stringify(interrupted),
      );
      assert.equal(
        (await adapter.createRequest({ ...input, idempotencyKey: 'b'.repeat(64) })).id,
        interruptedId,
      );

      // Expired keys remain tombstones; removing public records cannot enqueue them again.
      fs.writeFileSync(
        path.join(requestsPath, '.idempotency', `${'c'.repeat(64)}.json`),
        JSON.stringify({ ...interrupted, createdAt: '2020-01-01T00:00:00.000Z' }),
      );
      await assert.rejects(adapter.createRequest({ ...input, idempotencyKey: 'c'.repeat(64) }), {
        code: 'request-expired',
      });
      fs.writeFileSync(
        path.join(publicPath, 'jobs', `${job.id}.json`),
        JSON.stringify({ protocol: 1, ...done, updatedAt: '2020-01-01T00:00:00.000Z' }),
      );
      assert.equal((await adapter.getJob(job.id)).state, 'expired');
    });
  },
);
