import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import sinon from 'sinon';
import { afterEach, describe, it } from 'vitest';

const { ZipArchive } = require('archiver');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const configUtils = require('../../utils/config-utils');
const jobs = require('../../../core/server/services/jobs-service');
const legacyJobs = require('../../../core/server/services/jobs');
const importer = require('../../../core/server/data/importer');
const adapterManager = require('../../../core/server/services/adapter-manager').default;
const ContentImportJob =
  require('../../../core/server/data/importer/jobs/content-import-job').default;
const models = require('../../../core/server/models');

describe('Site content import delivery', function () {
  afterEach(async function () {
    sinon.restore();
    mockManager.restore();
    await configUtils.restore();
  });

  it('imports a ZIP through JobsService and retains its service across reboot', async function () {
    let firstImporter: unknown;
    let firstJobs: unknown;
    for (let boot = 0; boot < 2; boot++) {
      const agent = await agentProvider.getAdminAPIAgent();
      await fixtureManager.init();
      await agent.loginAsOwner();
      const service = importer.service;
      const jobsService = jobs.getInstance();
      assert.equal(service.jobsService, jobsService);
      if (boot === 0) {
        firstImporter = service;
        firstJobs = jobsService;
      } else {
        assert.equal(service, firstImporter);
        assert.equal(jobsService, firstJobs);
      }
      configUtils.set('env', 'production');
      assert.equal(service.config.get('env'), 'production');
      mockManager.mockMail();
      const dispatch = sinon.spy(jobsService, 'dispatch');
      const execute = sinon.spy(service, 'executeImport');
      const addJob = sinon.spy(legacyJobs, 'addJob');
      const addOneOffJob = sinon.spy(legacyJobs, 'addOneOffJob');
      const storage = adapterManager.getAdapter('storage:imports');
      const save = sinon.spy(storage, 'save');
      const remove = sinon.spy(storage, 'delete');
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'site-import-api-'));
      const slug = `site-import-${crypto.randomUUID()}`;
      const imageName = `${slug}.png`;
      const imageBytes = await fs.readFile(
        path.join(__dirname, '../../utils/fixtures/images/ghost-logo.png'),
      );
      const upload = path.join(directory, 'content.zip');
      const archive = new ZipArchive();
      const output = fs.createWriteStream(upload);
      const finished = new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);
      });
      archive.pipe(output);
      archive.append(
        JSON.stringify({
          db: [
            {
              meta: { version: '5.0.0' },
              data: {
                posts: [
                  {
                    title: 'Queued site import',
                    slug,
                    status: 'draft',
                    html: '<p>Imported content</p>',
                    feature_image: imageName,
                  },
                ],
              },
            },
          ],
        }),
        { name: 'content.json' },
      );
      archive.append(imageBytes, { name: imageName });
      await archive.finalize();
      await finished;
      try {
        await agent.post('db/').attach('importfile', upload).expectStatus(200);
        await fs.remove(directory);
        await mockManager.assert.sentEmailEventually(
          { subject: 'Your content import has finished' },
          { timeout: 10000 },
        );
        mockManager.assert.sentEmailCount(1);
        sinon.assert.calledOnce(dispatch);
        sinon.assert.notCalled(addJob);
        sinon.assert.notCalled(addOneOffJob);
        const job = dispatch.firstCall.args[0];
        assert.ok(job instanceof ContentImportJob);
        sinon.assert.calledOnce(execute);
        assert.ok(execute.firstCall.args[0] instanceof ContentImportJob);
        assert.notEqual(execute.firstCall.args[0], job);
        assert.deepEqual(execute.firstCall.args[0], job);
        sinon.assert.calledOnce(save);
        assert.equal(save.firstCall.args[0].name, job.uploadKey);
        assert.match(
          job.uploadKey,
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        sinon.assert.calledOnceWithExactly(remove, job.uploadKey);
        await assert.rejects(storage.readStream({ path: job.uploadKey }));
        const post = await models.Post.findOne(
          { slug },
          { context: { internal: true }, withRelated: ['tags'] },
        );
        assert.ok(post);
        assert.ok(
          post
            .related('tags')
            .models.some((tag: { get(key: string): string }) => tag.get('name') === job.importTag),
        );
        const images = adapterManager.getAdapter('storage:images');
        const imagePath = images.urlToPath(post.get('feature_image'));
        assert.deepEqual(await images.read({ path: imagePath }), imageBytes);
      } finally {
        await fs.remove(directory);
        sinon.restore();
        mockManager.restore();
        await configUtils.restore();
      }
    }
  });
});
