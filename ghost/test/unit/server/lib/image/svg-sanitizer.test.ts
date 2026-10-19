import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { JSDOM } from 'jsdom';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import {
  sanitizeSvgContent,
  sanitizeSvgFile,
} from '../../../../../core/server/lib/image/svg-sanitizer';

const fixturePath = (fixture: string) =>
  path.join(__dirname, '../../../../utils/fixtures/images', fixture);

describe('lib/image: svg-sanitizer', function () {
  describe('sanitizeSvgFile', function () {
    let tmpDir: string;

    const copyFixture = (fixture: string) => {
      const filePath = path.join(tmpDir, fixture);
      fs.copyFileSync(fixturePath(fixture), filePath);
      return filePath;
    };

    beforeEach(function () {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-svg-sanitizer-'));
    });

    afterEach(function () {
      sinon.restore();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('sanitizes an SVG file in place', async function () {
      const filePath = copyFixture('svg-with-unsafe-script.svg');

      assert.equal(await sanitizeSvgFile(filePath), true);

      const svg = fs.readFileSync(filePath, 'utf8');
      assert.match(svg, /<svg/);
      assert.doesNotMatch(svg, /<script/);
    });

    it('sanitizes an SVGZ file in place', async function () {
      const filePath = copyFixture('svgz-with-unsafe-script.svgz');

      assert.equal(await sanitizeSvgFile(filePath, true), true);

      const svg = zlib.gunzipSync(fs.readFileSync(filePath)).toString();
      assert.match(svg, /<svg/);
      assert.doesNotMatch(svg, /<script/);
    });

    it('returns false for SVGs that cannot be sanitized', async function () {
      assert.equal(await sanitizeSvgFile(copyFixture('svg-malformed.svg')), false);
    });

    it('does not touch files outside the temp directory', async function () {
      const error = sinon.stub(logging, 'error');
      const filePath = fixturePath('svg-with-unsafe-script.svg');
      const original = fs.readFileSync(filePath, 'utf8');

      assert.equal(await sanitizeSvgFile(filePath), false);
      assert.equal(await sanitizeSvgFile(path.join(os.tmpdir(), '..', 'file.svg')), false);

      assert.equal(fs.readFileSync(filePath, 'utf8'), original);
      sinon.assert.calledTwice(error);
    });
  });

  describe('sanitizeSvgContent', function () {
    const LINKED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <image href="https://tracker.example.net/pixel.png" width="1" height="1"/>
      <path d="M0 0h24v24H0z" fill="url(https://tracker.example.net/paint.svg#a)"/>
    </svg>`;

    it('keeps references to other documents unless asked to remove them', function () {
      const svg = sanitizeSvgContent(LINKED)!;

      assert.match(svg, /<image href="https:\/\/tracker\.example\.net\/pixel\.png"/);
      assert.match(svg, /fill="url\(https:\/\/tracker\.example\.net\/paint\.svg#a\)"/);
    });

    describe('self-contained', function () {
      const selfContained = (svg: string) => sanitizeSvgContent(svg, { selfContained: true });

      it('removes every reference to another document', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
          <image href="https://tracker.example.net/1.png" width="1" height="1"/>
          <image xlink:href="https://tracker.example.net/2.png" width="1" height="1"/>
          <image href="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" width="1" height="1"/>
          <filter id="f"><feImage href="https://tracker.example.net/3.png"/></filter>
          <linearGradient id="g" href="https://tracker.example.net/4.svg#g"/>
          <a href="https://tracker.example.net/5"><circle r="2"/></a>
          <path d="M0 0h24v24H0z" fill="url(https://tracker.example.net/6.svg#a)"/>
          <path d="M0 0h24v24H0z" mask="url( 'https://tracker.example.net/7.svg#m' )"/>
          <path d="M0 0h24v24H0z" style="filter: url(https://tracker.example.net/8.svg#f)"/>
          <path d="M0 0h24v24H0z" style="fill: \\75rl(https://tracker.example.net/9.svg#a)"/>
          <path d="M0 0h24v24H0z" style="cursor: image-set('https://tracker.example.net/10.png' 1x)"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /tracker|data:|<image|<feImage|\\/i);
        // The shapes themselves stay.
        assert.equal(svg.match(/<path /g)?.length, 5);
        assert.match(svg, /<circle r="2"\/>/);
      });

      it('keeps references within the SVG itself', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="base"><stop offset="0" stop-color="#fff"/></linearGradient>
            <linearGradient id="g" href="#base"/>
          </defs>
          <path d="M0 0h24v24H0z" fill="url(#g)" style="stroke: url('#g')"/>
        </svg>`)!;

        assert.match(svg, /<linearGradient id="g" href="#base"\/>/);
        assert.match(svg, /fill="url\(#g\)"/);
        assert.match(svg, /style="stroke: url\('#g'\)"/);
      });

      it('empties a stylesheet that refers to another document, and keeps one that does not', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <style>@import url(https://tracker.example.net/1.css);</style>
          <style>@font-face { font-family: x; src: url(https://tracker.example.net/2.woff); }</style>
          <style>path { fill: \\75rl(https://tracker.example.net/3.svg#a); }</style>
          <style>path { fill: white; }</style>
          <path d="M0 0h24v24H0z"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /tracker/);
        assert.match(svg, /<style>path \{ fill: white; \}<\/style>/);
      });

      // Removing an element DOMPurify doesn't allow also removes its text, which joins the
      // text either side of it.
      it('empties a stylesheet that only refers to another document once sanitized', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <style>@im<script>x</script>port "https://tracker.example.net/1.css";</style>
          <style>path { fill: u<foreignObject>x</foreignObject>rl(https://tracker.example.net/2.svg#a); }</style>
          <path d="M0 0h24v24H0z"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /tracker/);
        assert.match(svg, /<path d="M0 0h24v24H0z"\/>/);
      });

      /** The SVG's root as an image would read it. Throws if it isn't well-formed XML. */
      const asImage = (svg: string) =>
        new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.documentElement;

      it('returns an SVG that can be drawn as an image on its own', function () {
        const svg = selfContained(`<svg viewBox="0 0 24 24">
          <text>a\u00a0b &amp; c</text><path d="M0 0h24v24H0z"/>
        </svg>`)!;

        const root = asImage(svg);
        assert.equal(root.namespaceURI, 'http://www.w3.org/2000/svg');
        assert.equal(root.querySelector('text')!.textContent, 'a\u00a0b & c');
      });

      it('refuses anything but a single SVG', function () {
        const icon = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';
        for (const content of [
          `<!doctype html><html><head><title>Podcast</title></head>
            <body><header>${icon} Podcast</header><p>Loading…</p></body></html>`,
          `${icon} trailing`,
          `${icon}${icon}`,
        ]) {
          assert.equal(selfContained(content), null, content);
        }
      });
    });
  });
});
