import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import express from 'express';
import fs from 'fs-extra';
import sinon from 'sinon';
import request from 'supertest';
import type LocalFilesStorageClass from '../../../../../core/server/adapters/storage/LocalFilesStorage';

// The adapter reads the config singleton that config-utils mutates, so both
// have to come from the same `require` graph (see local-images-storage.test.ts).
const LocalFilesStorage: typeof LocalFilesStorageClass =
  require('../../../../../core/server/adapters/storage/LocalFilesStorage').default;
const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');

describe('Local Files Storage', function () {
  describe('serve', function () {
    let contentPath: string;
    let app: express.Express;

    async function writeFile(name: string, contents: string): Promise<string> {
      await fs.outputFile(path.join(contentPath, 'files', '2026', '09', name), contents);
      return `/2026/09/${name}`;
    }

    beforeEach(async function () {
      contentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-local-files-'));
      configUtils.set('paths:contentPath', contentPath);

      app = express();
      app.use(new LocalFilesStorage().serve());
    });

    afterEach(async function () {
      sinon.restore();
      await configUtils.restore();
      await fs.remove(contentPath);
    });

    const executableFiles = [
      ['xss.html', '<!doctype html><script>alert(document.domain)</script>', 'text/plain'],
      ['xss.htm', '<!doctype html><script>alert(document.domain)</script>', 'text/plain'],
      ['XSS.HTML', '<!doctype html><script>alert(document.domain)</script>', 'text/plain'],
      ['xss.js', 'alert(document.domain)', 'text/plain'],
      ['xss.css', 'body { background: red; }', 'text/plain'],
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
      it(`serves ${name} as ${contentType} instead of its extension type`, async function () {
        const urlPath = await writeFile(name, contents);

        await request(app)
          .get(urlPath)
          .expect(200)
          .expect('Content-Type', contentType)
          .expect('X-Content-Type-Options', 'nosniff');
      });
    }

    it('serves the original bytes of an overridden file', async function () {
      const html = '<!doctype html><script>alert(document.domain)</script>';
      const urlPath = await writeFile('page.html', html);

      const res = await request(app).get(urlPath).expect(200);

      assert.equal(res.text, html);
    });

    it('keeps browser-renderable types', async function () {
      const urlPath = await writeFile('document.pdf', '%PDF-1.4');

      await request(app)
        .get(urlPath)
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect('X-Content-Type-Options', 'nosniff');
    });

    describe('Pintura assets', function () {
      let jsPath: string;
      let cssPath: string;

      beforeEach(async function () {
        jsPath = await writeFile('pintura-umd.js', 'window.pintura = {};');
        cssPath = await writeFile('pintura.css', '.pintura {}');

        const { staticFileUrl } = new LocalFilesStorage();
        const get = sinon.stub(settingsCache, 'get');
        get.withArgs('pintura_js_url').returns(`${staticFileUrl}${jsPath}`);
        get.withArgs('pintura_css_url').returns(`${staticFileUrl}${cssPath}`);
      });

      it('serves the configured Pintura script as JavaScript', async function () {
        await request(app)
          .get(jsPath)
          .expect(200)
          .expect('Content-Type', /^(application|text)\/javascript/)
          .expect('X-Content-Type-Options', 'nosniff');
      });

      it('serves the configured Pintura stylesheet as CSS', async function () {
        await request(app)
          .get(cssPath)
          .expect(200)
          .expect('Content-Type', /^text\/css/)
          .expect('X-Content-Type-Options', 'nosniff');
      });

      it('keeps other scripts and stylesheets inert', async function () {
        const otherJs = await writeFile('other.js', 'alert(1)');
        const otherCss = await writeFile('other.css', 'body {}');

        await request(app).get(otherJs).expect(200).expect('Content-Type', 'text/plain');
        await request(app).get(otherCss).expect(200).expect('Content-Type', 'text/plain');
      });

      it('keeps files inert when Pintura is loaded from another host', async function () {
        sinon.restore();
        const get = sinon.stub(settingsCache, 'get');
        get.withArgs('pintura_js_url').returns(`https://cdn.example.com${jsPath}`);
        get.withArgs('pintura_css_url').returns(null);

        await request(app).get(jsPath).expect(200).expect('Content-Type', 'text/plain');
      });
    });
  });
});
