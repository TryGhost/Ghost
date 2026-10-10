import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import express from 'express';
import fs from 'node:fs/promises';
import sinon from 'sinon';
import request from 'supertest';
import type settingsCacheInstance from '../../../../../core/shared/settings-cache';
import type LocalFilesStorageClass from '../../../../../core/server/adapters/storage/LocalFilesStorage';

// The adapter reads the config singleton that config-utils mutates, so both
// have to come from the same `require` graph (see local-images-storage.test.ts).
const LocalFilesStorage: typeof LocalFilesStorageClass =
  require('../../../../../core/server/adapters/storage/LocalFilesStorage').default;
const configUtils = require('../../../../utils/config-utils');
const settingsCache: typeof settingsCacheInstance = require('../../../../../core/shared/settings-cache');

describe('Local Files Storage', function () {
  describe('serve', function () {
    let contentPath: string;
    let app: express.Express;
    let storage: LocalFilesStorageClass;
    let getSetting: sinon.SinonStub<[string, { resolve?: boolean }?], unknown>;

    async function writeFile(name: string, contents: string): Promise<string> {
      const outputPath = path.join(contentPath, 'files', '2026', '09', name);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, contents);
      return `/2026/09/${name}`;
    }

    beforeEach(async function () {
      contentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-local-files-'));
      configUtils.set('paths:contentPath', contentPath);
      getSetting = sinon.stub(settingsCache, 'get').returns(null);

      app = express();
      storage = new LocalFilesStorage();
      app.use(storage.serve());
    });

    afterEach(async function () {
      sinon.restore();
      await configUtils.restore();
      await fs.rm(contentPath, { recursive: true, force: true });
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

        getSetting.withArgs('pintura_js_url').returns(`${storage.staticFileUrl}${jsPath}`);
        getSetting.withArgs('pintura_css_url').returns(`${storage.staticFileUrl}${cssPath}`);
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
        const remoteUrl = new URL(`${storage.staticFileUrl}${jsPath}`);
        remoteUrl.hostname = 'cdn.example.com';
        getSetting.withArgs('pintura_js_url').returns(remoteUrl.href);
        getSetting.withArgs('pintura_css_url').returns(null);

        await request(app).get(jsPath).expect(200).expect('Content-Type', 'text/plain');
      });

      it('supports root-relative URLs with query strings and fragments', async function () {
        const prefix = new URL(storage.staticFileUrl).pathname;
        getSetting.withArgs('pintura_js_url').returns(`${prefix}${jsPath}?v=8#module`);
        getSetting.withArgs('pintura_css_url').returns(`${prefix}${cssPath}?v=8#style`);

        await request(app)
          .get(jsPath)
          .expect(200)
          .expect('Content-Type', /^text\/javascript/);
        await request(app)
          .get(cssPath)
          .expect(200)
          .expect('Content-Type', /^text\/css/);
      });

      it('supports sites installed in a subdirectory', async function () {
        configUtils.set('url', 'https://example.com/blog/');
        storage = new LocalFilesStorage();
        app = express();
        app.use(storage.serve());
        getSetting.withArgs('pintura_js_url').returns(`${storage.staticFileUrl}${jsPath}`);
        getSetting.withArgs('pintura_css_url').returns(`/blog/content/files${cssPath}`);

        await request(app)
          .get(jsPath)
          .expect(200)
          .expect('Content-Type', /^text\/javascript/);
        await request(app)
          .get(cssPath)
          .expect(200)
          .expect('Content-Type', /^text\/css/);
      });

      it('matches encoded filenames and upper-case extensions', async function () {
        const assetPath = await writeFile('pintura editor.JS', 'window.pintura = {};');
        getSetting
          .withArgs('pintura_js_url')
          .returns(`${storage.staticFileUrl}${encodeURI(assetPath)}`);

        await request(app)
          .get(encodeURI(assetPath))
          .expect(200)
          .expect('Content-Type', /^text\/javascript/);
      });

      for (const value of [undefined, null, '', false, 42, {}, ['url'], 'http://[invalid']) {
        it(`keeps files inert with an invalid or unset URL: ${JSON.stringify(value)}`, async function () {
          getSetting.withArgs('pintura_js_url').returns(value);

          await request(app)
            .get(jsPath)
            .expect(200)
            .expect('Content-Type', 'text/plain')
            .expect('X-Content-Type-Options', 'nosniff');
        });
      }

      it('keeps HTML and SVG inert even when selected in Pintura settings', async function () {
        const htmlPath = await writeFile('pintura.html', '<script>alert(1)</script>');
        const svgPath = await writeFile('pintura.svg', '<svg onload="alert(1)"></svg>');
        getSetting.withArgs('pintura_js_url').returns(`${storage.staticFileUrl}${htmlPath}`);
        getSetting.withArgs('pintura_css_url').returns(`${storage.staticFileUrl}${svgPath}`);

        await request(app).get(htmlPath).expect(200).expect('Content-Type', 'text/plain');
        await request(app)
          .get(svgPath)
          .expect(200)
          .expect('Content-Type', 'application/octet-stream');
      });

      it('requires the matching setting for each asset type', async function () {
        getSetting.withArgs('pintura_js_url').returns(`${storage.staticFileUrl}${cssPath}`);
        getSetting.withArgs('pintura_css_url').returns(`${storage.staticFileUrl}${jsPath}`);

        await request(app).get(jsPath).expect(200).expect('Content-Type', 'text/plain');
        await request(app).get(cssPath).expect(200).expect('Content-Type', 'text/plain');
      });

      for (const suffix of ['-other', '/%2e%2e', '/%2e%2e%2f%2e%2e', '/%ZZ']) {
        it(`rejects URLs outside storage or with invalid encoding: ${suffix}`, async function () {
          getSetting
            .withArgs('pintura_js_url')
            .returns(`${storage.staticFileUrl}${suffix}${jsPath}`);

          await request(app).get(jsPath).expect(200).expect('Content-Type', 'text/plain');
        });
      }

      it('uses updated settings when assets are replaced or cleared', async function () {
        await request(app)
          .get(jsPath)
          .expect(200)
          .expect('Content-Type', /^text\/javascript/);

        const replacement = await writeFile('pintura-new.js', 'window.pintura = {};');
        getSetting.withArgs('pintura_js_url').returns(`${storage.staticFileUrl}${replacement}`);
        await request(app)
          .get(replacement)
          .expect(200)
          .expect('Content-Type', /^text\/javascript/);
        await request(app).get(jsPath).expect(200).expect('Content-Type', 'text/plain');

        getSetting.withArgs('pintura_js_url').returns(null);
        await request(app).get(replacement).expect(200).expect('Content-Type', 'text/plain');
      });
    });
  });
});
