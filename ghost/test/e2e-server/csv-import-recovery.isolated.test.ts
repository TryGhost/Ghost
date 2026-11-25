import assert from 'node:assert/strict';
import { fork, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const { agentProvider, fixtureManager } = require('../utils/e2e-framework');
const {
  compress,
}: { compress(source: string, destination: string): Promise<void> } = require('@tryghost/zip');
const config = require('../../core/shared/config');
const models = require('../../core/server/models');
const { knex } = require('../../core/server/data/db');
const { getInstance: getJobsService } = require('../../core/server/services/jobs-service');

interface WorkerMessage {
  type: 'paused' | 'finished' | 'error';
  importId: string;
  html?: string;
  message?: string;
  cancellationPath?: string;
}

async function receive(worker: ChildProcess, type: WorkerMessage['type']): Promise<WorkerMessage> {
  const controller = new AbortController();
  const options = { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]) };
  try {
    return await Promise.race([
      once(worker, 'exit', options).then(([code, signal]) => {
        throw new Error(`Worker exited before ${type} (${code ?? signal})`);
      }),
      (async () => {
        for (;;) {
          const [message] = (await once(worker, 'message', options)) as [WorkerMessage];
          if (message.type === 'error') {
            throw new Error(message.message);
          }
          if (message.type === type) {
            return message;
          }
        }
      })(),
    ]);
  } finally {
    controller.abort();
  }
}

describe('CSV import worker recovery through the retained outbox', function () {
  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    // Only child workers may consume the retained jobs in this isolated suite.
    await getJobsService().shutdown();
  });

  it.each([
    ['csv', false],
    ['zip', false],
    ['csv', true],
    ['zip', true],
  ] as const)(
    'replays an unfinished %s import after killing the worker (cancel: %s)',
    async function (format, cancel) {
      const directory = await mkdtemp(path.join(os.tmpdir(), 'csv-worker-recovery-'));
      const children: ChildProcess[] = [];
      const contentPath: string = config.get('paths:contentPath');
      const spawnWorker = (args: string[]) => {
        const child = fork(path.resolve('test/utils/csv-import-worker.js'), args, {
          execArgv: ['--conditions=source', '--require', 'tsx/cjs'],
          env: {
            ...process.env,
            TMPDIR: directory,
            paths__contentPath: contentPath,
            services__jobs__outbox__enabled: 'true',
            services__jobs__outbox__keepUntilSettled: 'true',
            services__jobs__outbox__leaseMs: '2000',
            services__jobs__outbox__pollIntervalMs: '100',
          },
          stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
        });
        children.push(child);
        return child;
      };

      let retainedJobId: string | undefined;
      try {
        const fileName = `recovery.${format}`;
        const filePath = path.join(directory, fileName);
        const title = `Worker recovery ${format} ${cancel}`;
        const rows = Array.from(
          { length: 27 },
          (_, index) =>
            `${title} ${index + 1},"<a href=""/content/files/recovery-guide.pdf"">Guide</a>"`,
        );
        const csv = ['title,html', ...rows].join('\n');
        if (format === 'zip') {
          const wrapper = path.join(directory, 'archive');
          await mkdir(path.join(wrapper, 'content/files'), { recursive: true });
          await writeFile(path.join(wrapper, 'posts.csv'), csv);
          await writeFile(path.join(wrapper, 'content/files/recovery-guide.pdf'), 'guide bytes');
          await compress(wrapper, filePath);
        } else {
          await writeFile(filePath, csv);
        }

        const first = spawnWorker([filePath, fileName]);
        const paused = await receive(first, 'paused');
        const exited = once(first, 'exit');
        first.kill('SIGKILL');
        await exited;

        const retained = await knex('jobs_outbox').select('id', 'envelope', 'submitted_at');
        const importJobs = retained.filter((entry: { envelope: string }) => {
          const { job } = JSON.parse(entry.envelope).payload;
          return (
            job.type === 'content-csv-import' &&
            JSON.parse(job.payload).importId === paused.importId
          );
        });
        assert.equal(importJobs.length, 1, 'the interrupted job remains in the outbox');
        retainedJobId = importJobs[0].id;
        assert.ok(
          importJobs[0].submitted_at,
          'the job had already been handed to the first worker',
        );

        if (cancel) {
          assert.ok(paused.cancellationPath);
          await writeFile(paused.cancellationPath, '');
        }
        const second = spawnWorker([]);
        const result = await receive(second, 'finished');
        assert.equal(result.importId, paused.importId);
        await vi.waitFor(
          async () => {
            assert.equal(await knex('jobs_outbox').where('id', retainedJobId).first(), undefined);
          },
          { timeout: 5000 },
        );
        if (cancel) {
          // Row 26 committed before the crash but was never journalled. Cancellation
          // must not replay it or start row 27; the report retains the 25 durable rows.
          assert.match(result.html ?? '', /Your content import was cancelled/);
          assert.match(result.html ?? '', /Created:<\/strong> 25/);
        } else {
          assert.match(result.html ?? '', /Created:<\/strong> 26/);
          assert.match(result.html ?? '', /Skipped:<\/strong> 1/);
        }
        const { data: posts } = await models.Post.findPage({
          filter: `title:~'${title}'`,
          status: 'all',
          limit: 'all',
        });
        assert.equal(posts.length, cancel ? 26 : 27);
        if (format === 'zip' && !cancel) {
          const assets = await readdir(path.join(contentPath, 'files'));
          assert.deepEqual(
            assets.filter((asset) => asset.startsWith('recovery-guide')),
            ['recovery-guide.pdf'],
          );
          assert.ok(
            posts.every((post: { get(key: string): string }) =>
              post.get('html').includes('/content/files/recovery-guide.pdf'),
            ),
          );
        }
      } finally {
        for (const child of children) {
          if (child.exitCode === null && child.signalCode === null) {
            const exited = once(child, 'exit');
            child.kill('SIGKILL');
            await exited;
          }
        }
        if (retainedJobId) {
          await knex('jobs_outbox').where('id', retainedJobId).delete();
        }
        await rm(directory, { recursive: true, force: true });
      }
    },
    60000,
  );
});
