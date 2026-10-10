const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { agentProvider, fixtureManager } = require('../utils/e2e-framework');
const config = require('../../core/shared/config');

describe('Static files', function () {
  let adminAgent;
  let frontendAgent;
  let ghostServer;

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsWithFrontend();
    adminAgent = agents.adminAgent;
    frontendAgent = agents.frontendAgent;
    ghostServer = agents.ghostServer;

    await fixtureManager.init();
    await adminAgent.loginAsOwner();
  });

  afterAll(async function () {
    await ghostServer.stop();
  });

  describe('uploaded files', function () {
    const uploadedPaths = [];
    let tmpDir;

    async function uploadFile(filePath) {
      const { body } = await adminAgent
        .post('files/upload/')
        .attach('file', filePath)
        .expectStatus(201);

      const urlPath = new URL(body.files[0].url).pathname;
      uploadedPaths.push(urlPath);
      return urlPath;
    }

    beforeAll(function () {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-static-files-'));
    });

    afterAll(function () {
      fs.removeSync(tmpDir);
      for (const urlPath of uploadedPaths) {
        fs.removeSync(
          path.join(config.getContentPath('files'), urlPath.replace(/^\/content\/files\//, '')),
        );
      }
    });

    const executableFiles = [
      ['xss.html', '<!doctype html><script>alert(document.domain)</script>', 'text/plain'],
      ['xss.js', 'alert(document.domain)', 'text/plain'],
      [
        'xss.xml',
        '<x:script xmlns:x="http://www.w3.org/1999/xhtml">alert(1)</x:script>',
        'text/plain',
      ],
      [
        'xss.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.domain)"></svg>',
        'application/octet-stream',
      ],
    ];

    for (const [name, contents, contentType] of executableFiles) {
      it(`serves an uploaded ${path.extname(name)} file as ${contentType}`, async function () {
        const filePath = path.join(tmpDir, name);
        fs.writeFileSync(filePath, contents);

        const urlPath = await uploadFile(filePath);

        const response = await frontendAgent
          .get(urlPath)
          .expect(200)
          .expect('Content-Type', contentType)
          .expect('X-Content-Type-Options', 'nosniff');

        if (contentType === 'text/plain') {
          assert.equal(response.text, contents);
        }
      });
    }

    it('serves an uploaded PDF with its own content type', async function () {
      const urlPath = await uploadFile(path.join(__dirname, '../utils/fixtures/files/test.pdf'));

      await frontendAgent
        .get(urlPath)
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect('X-Content-Type-Options', 'nosniff');
    });
  });

  it('serves plain text 404 for non-existing resized + original files', async function () {
    const response = await frontendAgent
      .get('/content/images/size/w2000/1995/12/daniel.jpg')
      .expect(404)
      .expect('Content-Type', 'text/plain; charset=utf-8');

    assert.equal(response.text, 'Image not found');
  });

  it('returns plain text 404 for non-existing asset files with extensions', async function () {
    const response = await frontendAgent
      .get('/assets/css/missing.css')
      .expect(404)
      .expect('Content-Type', 'text/plain; charset=utf-8');

    assert.equal(response.text, 'File not found');
  });

  it('returns plain text 404 for non-existing arbitrary files with extensions', async function () {
    const response = await frontendAgent
      .get('/images/fake.png')
      .expect(404)
      .expect('Content-Type', 'text/plain; charset=utf-8');

    assert.equal(response.text, 'File not found');
  });
});
