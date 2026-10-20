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

    it('refuses content that is not an SVG with something in it', function () {
      for (const content of ['<html><body>Not found</body></html>', 'GIF89a', '<svg></svg>']) {
        assert.equal(sanitizeSvgContent(content), null, content);
        assert.equal(sanitizeSvgContent(content, { selfContained: true }), null, content);
      }
    });

    describe('self-contained', function () {
      const selfContained = (svg: string) => sanitizeSvgContent(svg, { selfContained: true });

      it('removes anything that could run', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24" onload="alert(1)">
          <script>alert(2)</script>
          <foreignObject><img src="x" onerror="alert(3)"/></foreignObject>
          <path d="M0 0h24v24H0z"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /script|alert|onload|onerror|foreignObject|<img/i);
        assert.match(svg, /^<svg [^>]*viewBox="0 0 24 24">/);
        assert.match(svg, /<path d="M0 0h24v24H0z"\/>/);
      });

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
          <use href="https://tracker.example.net/11.svg#a"/>
          <use xlink:href="https://tracker.example.net/12.svg#a"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /tracker|data:|<image|<feImage|\\/i);
        // The shapes themselves stay.
        assert.equal(svg.match(/<path /g)?.length, 5);
        assert.match(svg, /<circle r="2"\/>/);
      });

      /** The prefix the SVG's IDs were given, from the ID of its element with `original`. */
      const idPrefix = (svg: string, original: string) => {
        const prefix = new RegExp(`id="(svg-[0-9a-f]+-)${original}"`).exec(svg)?.[1];
        assert.ok(prefix, `Expected an ID ending in ${original}`);
        return prefix;
      };

      it('keeps references within the SVG itself, through IDs of its own', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="base"><stop offset="0" stop-color="#fff"/></linearGradient>
            <linearGradient id="g" href="#base"/>
            <path id="shape" d="M0 0h24v24H0z"/>
          </defs>
          <path d="M0 0h24v24H0z" fill="url(#g)" style="stroke: url('#g')"/>
          <path d="M0 0h24v24H0z" fill="url( #g )" stroke="URL( ' #g' )"/>
          <use href="#shape" fill="url(#g)"/>
          <use xlink:href=" #shape"/>
        </svg>`)!;

        const prefix = idPrefix(svg, 'g');
        assert.match(svg, new RegExp(`<linearGradient id="${prefix}g" href="#${prefix}base"/>`));
        assert.match(svg, new RegExp(`<use href="#${prefix}shape" fill="url\\(#${prefix}g\\)"/>`));
        assert.match(svg, new RegExp(`<use xlink:href="#${prefix}shape"/>`));
        assert.match(
          svg,
          new RegExp(`fill="url\\( #${prefix}g \\)" stroke="URL\\( ' #${prefix}g' \\)"`),
        );
        assert.match(svg, new RegExp(`style="stroke: url\\('#${prefix}g'\\)"`));
        // Every ID and every reference has the prefix.
        const reference = `(?:href="\\s*|url\\(\\s*['"]?\\s*)#`;
        assert.equal(svg.match(/id="/g)?.length, 3);
        assert.equal(svg.match(new RegExp(`id="${prefix}`, 'g'))?.length, 3);
        assert.equal(svg.match(new RegExp(reference, 'gi'))?.length, 8);
        assert.equal(svg.match(new RegExp(`${reference}${prefix}`, 'gi'))?.length, 8);
      });

      it('gives the IDs of each SVG a prefix of its own, the same each time', function () {
        const svg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <linearGradient id="g"><stop offset="0" stop-color="${color}"/></linearGradient>
          <path d="M0 0h24v24H0z" fill="url(#g)"/>
        </svg>`;

        const white = idPrefix(selfContained(svg('#fff'))!, 'g');
        assert.equal(idPrefix(selfContained(svg('#fff'))!, 'g'), white);
        assert.notEqual(idPrefix(selfContained(svg('#000'))!, 'g'), white);
      });

      it('removes references to IDs that would not get the prefix', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path id="a" d="M0 0h24v24H0z" aria-labelledby="a" aria-describedby="a"/>
          <path d="M0 0h24v24H0z" style="mask-image: -moz-element(#a)"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /aria-|element\(/);
        assert.equal(svg.match(/<path /g)?.length, 2);
      });

      // As Adobe Illustrator writes them.
      it('moves its stylesheet onto the elements it styles', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <defs>
            <style>.st0{fill:#fff}.st1{fill:url(#g)} #shape{stroke:#000} :root{opacity:.9}</style>
            <linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient>
          </defs>
          <path class="st0" d="M0 0h24v24H0z"/>
          <path id="shape" class="st0 st1" style="opacity:.5" d="M0 0h2v2H0z"/>
          <use href="#shape"/>
        </svg>`)!;

        const prefix = idPrefix(svg, 'g');
        assert.doesNotMatch(svg, /<style|class=/);
        assert.match(svg, /^<svg [^>]*><g style="opacity:\.9"><defs>/);
        assert.match(svg, /<path d="M0 0h24v24H0z" style="fill:#fff"\/>/);
        assert.match(
          svg,
          new RegExp(
            `<path id="${prefix}shape" style="fill:url\\(#${prefix}g\\);stroke:#000;opacity:\\.5"`,
          ),
        );
        assert.match(svg, new RegExp(`<use href="#${prefix}shape"/>`));
      });

      it('removes the rules that depend on how the SVG is shown', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <style>
            path { fill: #fff }
            path:hover { fill: red }
            @media (prefers-color-scheme: dark) { path { fill: #000 } }
            @keyframes spin { to { transform: rotate(1turn) } }
          </style>
          <path d="M0 0h24v24H0z"/>
        </svg>`)!;

        assert.match(svg, /<svg [^>]*><path d="M0 0h24v24H0z" style="fill:#fff"\/><\/svg>$/);
      });

      it('empties a stylesheet that refers to another document, and keeps one that does not', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <style>@import url(https://tracker.example.net/1.css);</style>
          <style>@font-face { font-family: x; src: url(https://tracker.example.net/2.woff); }</style>
          <style>path { fill: \\75rl(https://tracker.example.net/3.svg#a); }</style>
          <style>path { stroke: white; }</style>
          <path d="M0 0h24v24H0z"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /tracker/);
        assert.match(svg, /<path d="M0 0h24v24H0z" style="stroke:white"\/>/);
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

      // As Adobe Illustrator's Save As writes it. Parsed as HTML, the doctype ends at the
      // first `>`, which is inside the entity declarations.
      it('keeps an SVG whose doctype declares entities', function () {
        const svg = selfContained(`<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 24.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_extend "http://ns.adobe.com/Extensibility/1.0/">
	<!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/">
]>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>
`)!;

        assert.match(svg, /^<svg [^>]*viewBox="0 0 24 24"><path d="M0 0h24v24H0z"\/><\/svg>$/);
        assert.equal(asImage(svg).namespaceURI, 'http://www.w3.org/2000/svg');
      });

      // A page lays out the root as a box of its own, which its styling could move or grow.
      it('moves the styling of its root onto its content, leaving the root only its size', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
          x="0px" y="0px" id="logo" viewBox="0 0 24 24" width="24" height="24"
          preserveAspectRatio="xMinYMin meet" style="position:fixed;inset:0;fill:red"
          transform="scale(50)" overflow="visible" fill-rule="evenodd">
          <style>svg { z-index: 9 }</style>
          <path d="M0 0h24v24H0z"/>
        </svg>`)!;

        const root = asImage(svg);
        const names = (element: Element) =>
          [...element.attributes]
            .map(({ name }) => name)
            .filter((name) => !name.startsWith('xmlns'));
        assert.deepEqual(names(root).sort(), ['height', 'preserveAspectRatio', 'viewBox', 'width']);
        assert.equal(root.children.length, 1);
        const content = root.children[0];
        assert.equal(content.localName, 'g');
        assert.deepEqual(names(content).sort(), [
          'fill-rule',
          'id',
          'overflow',
          'style',
          'transform',
        ]);
        assert.equal(content.id, `${idPrefix(svg, 'logo')}logo`);
        assert.equal(content.getAttribute('style'), 'z-index:9;position:fixed;inset:0;fill:red');
        assert.equal(content.getAttribute('transform'), 'scale(50)');
        assert.deepEqual(
          [...content.children].map((child) => child.localName),
          ['path'],
        );
      });

      it('removes links, tab stops and data attributes, which only matter in a page', function () {
        const svg = selfContained(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <a href="#shape"><path id="shape" tabindex="0" d="M0 0h24v24H0z"/></a>
          <circle r="2" data-action="delete" tabindex="-1"/>
        </svg>`)!;

        assert.doesNotMatch(svg, /<a|tabindex|data-/);
        assert.match(svg, /<path id="svg-[0-9a-f]+-shape" d="M0 0h24v24H0z"\/><circle r="2"\/>/);
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
