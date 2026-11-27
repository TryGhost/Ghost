import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getStorageContentType,
  detectStorageContentType,
  getInertContentType,
} from '../../../../core/server/lib/file-types';

const fixturePath = (fixture: string) =>
  path.join(__dirname, '../../../utils/fixtures/images', fixture);

const fixture = (name: string) => fs.readFileSync(fixturePath(name));

describe('file-types', function () {
  describe('getStorageContentType', function () {
    describe('override extensions return text/plain', function () {
      it('.html', function () {
        assert.equal(getStorageContentType('page.html'), 'text/plain');
      });

      it('.htm', function () {
        assert.equal(getStorageContentType('page.htm'), 'text/plain');
      });

      it('.js', function () {
        assert.equal(getStorageContentType('app.js'), 'text/plain');
      });

      it('.css', function () {
        assert.equal(getStorageContentType('styles.css'), 'text/plain');
      });

      it('.xml', function () {
        assert.equal(getStorageContentType('feed.xml'), 'text/plain');
      });

      it('is case-insensitive', function () {
        assert.equal(getStorageContentType('PAGE.HTML'), 'text/plain');
        assert.equal(getStorageContentType('App.JS'), 'text/plain');
      });
    });

    describe('overrides take precedence over browser-renderable', function () {
      it('.xml is overridden even though application/xml is a known type', function () {
        assert.equal(getStorageContentType('data.xml'), 'text/plain');
      });
    });

    describe('browser-renderable extensions return natural content type', function () {
      it('.pdf -> application/pdf', function () {
        assert.equal(getStorageContentType('report.pdf'), 'application/pdf');
      });

      it('.jpg -> image/jpeg', function () {
        assert.equal(getStorageContentType('photo.jpg'), 'image/jpeg');
      });

      it('.jpeg -> image/jpeg', function () {
        assert.equal(getStorageContentType('photo.jpeg'), 'image/jpeg');
      });

      it('.png -> image/png', function () {
        assert.equal(getStorageContentType('image.png'), 'image/png');
      });

      it('.gif -> image/gif', function () {
        assert.equal(getStorageContentType('animation.gif'), 'image/gif');
      });

      it('.webp -> image/webp', function () {
        assert.equal(getStorageContentType('image.webp'), 'image/webp');
      });

      it('.json -> application/json', function () {
        assert.equal(getStorageContentType('data.json'), 'application/json');
      });

      it('.txt -> text/plain', function () {
        assert.equal(getStorageContentType('notes.txt'), 'text/plain');
      });

      it('.mp3 -> audio/mpeg', function () {
        assert.equal(getStorageContentType('song.mp3'), 'audio/mpeg');
      });

      it('.wav -> audio/wave', function () {
        assert.equal(getStorageContentType('clip.wav'), 'audio/wave');
      });

      it('.m4a -> audio/mp4', function () {
        assert.equal(getStorageContentType('track.m4a'), 'audio/mp4');
      });

      it('.mp4 -> video/mp4', function () {
        assert.equal(getStorageContentType('video.mp4'), 'video/mp4');
      });

      it('.mov -> video/quicktime', function () {
        assert.equal(getStorageContentType('video.mov'), 'video/quicktime');
      });

      it('.woff -> font/woff', function () {
        assert.equal(getStorageContentType('font.woff'), 'font/woff');
      });

      it('.woff2 -> font/woff2', function () {
        assert.equal(getStorageContentType('font.woff2'), 'font/woff2');
      });

      it('.otf -> font/otf', function () {
        assert.equal(getStorageContentType('font.otf'), 'font/otf');
      });
    });

    describe('executable types are never returned as browser-renderable', function () {
      it('text/html is not renderable', function () {
        assert.equal(getStorageContentType('page.html'), 'text/plain');
        assert.notEqual(getStorageContentType('page.html'), 'text/html');
      });

      it('application/javascript is not renderable', function () {
        assert.equal(getStorageContentType('app.js'), 'text/plain');
        assert.notEqual(getStorageContentType('app.js'), 'application/javascript');
      });

      it('text/css is not renderable', function () {
        assert.equal(getStorageContentType('styles.css'), 'text/plain');
        assert.notEqual(getStorageContentType('styles.css'), 'text/css');
      });

      it('image/svg+xml is not renderable', function () {
        assert.equal(getStorageContentType('icon.svg'), 'application/octet-stream');
        assert.notEqual(getStorageContentType('icon.svg'), 'image/svg+xml');
      });
    });

    describe('all other extensions return application/octet-stream', function () {
      it('.docx', function () {
        assert.equal(getStorageContentType('document.docx'), 'application/octet-stream');
      });

      it('.psd', function () {
        assert.equal(getStorageContentType('design.psd'), 'application/octet-stream');
      });

      it('.zip', function () {
        assert.equal(getStorageContentType('archive.zip'), 'application/octet-stream');
      });

      it('.xlsx', function () {
        assert.equal(getStorageContentType('spreadsheet.xlsx'), 'application/octet-stream');
      });

      it('.epub', function () {
        assert.equal(getStorageContentType('book.epub'), 'application/octet-stream');
      });

      it('.pptx', function () {
        assert.equal(getStorageContentType('slides.pptx'), 'application/octet-stream');
      });

      it('.svg', function () {
        assert.equal(getStorageContentType('logo.svg'), 'application/octet-stream');
      });

      it('.svgz', function () {
        assert.equal(getStorageContentType('logo.svgz'), 'application/octet-stream');
      });

      it('.apkg', function () {
        assert.equal(getStorageContentType('flashcards.apkg'), 'application/octet-stream');
      });

      it('.ipynb', function () {
        assert.equal(getStorageContentType('notebook.ipynb'), 'application/octet-stream');
      });

      it('.paprikarecipes', function () {
        assert.equal(getStorageContentType('dinner.paprikarecipes'), 'application/octet-stream');
      });

      it('unknown extension', function () {
        assert.equal(getStorageContentType('file.randomjunk'), 'application/octet-stream');
      });
    });
  });

  describe('getInertContentType', function () {
    it('forces the names a browser would execute', function () {
      assert.equal(getInertContentType('page.html'), 'text/plain');
      assert.equal(getInertContentType('page.htm'), 'text/plain');
      assert.equal(getInertContentType('app.js'), 'text/plain');
      assert.equal(getInertContentType('styles.css'), 'text/plain');
      assert.equal(getInertContentType('feed.xml'), 'text/plain');
      assert.equal(getInertContentType('PAGE.HTML'), 'text/plain');
    });

    it('says nothing about names that are already harmless', function () {
      // The caller leaves these to whatever serves them, rather than
      // downgrading files that were never a risk
      assert.equal(getInertContentType('README.md'), undefined);
      assert.equal(getInertContentType('photo.jpg'), undefined);
      assert.equal(getInertContentType('scan.tiff'), undefined);
      assert.equal(getInertContentType('thing.randomjunk'), undefined);
    });
  });

  describe('detectStorageContentType', function () {
    describe('contents decide the type', function () {
      it('reads the type from a buffer', async function () {
        assert.equal(await detectStorageContentType(fixture('ghosticon.jpg')), 'image/jpeg');
      });

      it('reads the type from a path', async function () {
        assert.equal(await detectStorageContentType(fixturePath('ghosticon.jpg')), 'image/jpeg');
      });

      it('recognises the other renderable image formats', async function () {
        assert.equal(await detectStorageContentType(fixture('ghost-logo.png')), 'image/png');
        assert.equal(await detectStorageContentType(fixture('loadingcat.gif')), 'image/gif');
        assert.equal(await detectStorageContentType(fixture('ghosticon.webp')), 'image/webp');
      });

      it('does not care what the file is named', async function () {
        // The caller passes contents only, so a name can't influence the type
        assert.equal(await detectStorageContentType(fixture('ghosticon.jpg')), 'image/jpeg');
      });
    });

    describe('image formats are kept, including ones a filename may not claim', function () {
      it('.ico, which image uploads allow and the renderable list does not', async function () {
        // Ghost serves its own favicon as image/x-icon, so a stored one
        // matching that is what the rest of the product expects
        assert.equal(await detectStorageContentType(fixture('favicon.ico')), 'image/x-icon');
      });

      it('.avif, which a site can add to its image uploads', async function () {
        assert.equal(await detectStorageContentType(fixture('ghosticon.avif')), 'image/avif');
      });
    });

    describe('media Ghost accepts stays playable, not a download', function () {
      // The renderable list is written for filenames, via mime-types, and its
      // vocabulary differs from the detector's — a WAV is audio/wave by
      // extension and audio/wav by contents. Holding detection to that list
      // turned most of the media store into downloads.
      const mediaFixture = (name: string) =>
        fs.readFileSync(path.join(__dirname, '../../../utils/fixtures/media', name));

      const cases: [string, string][] = [
        ['sample.mp3', 'audio/mpeg'],
        ['sample.m4a', 'audio/x-m4a'],
        ['sample.ogg', 'audio/ogg'],
        ['sample_640x360.mp4', 'video/mp4'],
        ['sample_640x360.ogv', 'video/ogg'],
        ['sample_640x360.webm', 'video/webm'],
      ];

      for (const [name, expected] of cases) {
        it(`${name} -> ${expected}`, async function () {
          assert.equal(await detectStorageContentType(mediaFixture(name)), expected);
        });
      }

      it('a WAV keeps the type its contents give it', async function () {
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36, 4);
        header.write('WAVEfmt ', 8);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(1, 22);
        header.writeUInt32LE(8000, 24);
        header.write('data', 36);

        assert.equal(await detectStorageContentType(header), 'audio/wav');
      });
    });

    describe('formats that are not safe to render become a download', function () {
      it('a zip archive', async function () {
        // PK\x03\x04 followed by enough bytes for file-type to be sure
        const zip = Buffer.concat([Buffer.from('PK\u0003\u0004'), Buffer.alloc(64)]);
        assert.equal(await detectStorageContentType(zip), 'application/octet-stream');
      });
    });

    describe('contents that do not identify themselves return undefined', function () {
      it('SVG markup, so the caller keeps its own type', async function () {
        // file-type reads an SVG as XML, which says nothing about the image
        assert.equal(await detectStorageContentType(fixture('ghost-logo.svg')), undefined);
      });

      it('HTML markup', async function () {
        assert.equal(
          await detectStorageContentType(Buffer.from('<!DOCTYPE html><h1>hi</h1>')),
          undefined,
        );
      });

      it('JSON', async function () {
        assert.equal(await detectStorageContentType(Buffer.from('{"a":1}')), undefined);
      });

      it('plain text', async function () {
        assert.equal(await detectStorageContentType(Buffer.from('just words')), undefined);
      });

      it('every wrapper format it skips is one the detector can actually return', async function () {
        // Guards against the skip list growing entries that nothing produces,
        // which would read as deliberate while doing nothing
        const { supportedMimeTypes } = await import('file-type');

        for (const mime of ['application/xml', 'application/gzip']) {
          assert.ok(supportedMimeTypes.has(mime), `file-type never returns ${mime}`);
        }
      });

      it('a gzip wrapper, which says nothing about what it holds', async function () {
        // A .svgz is gzipped SVG, and is served as an image by its extension
        const gzippedSvg = require('node:zlib').gzipSync(fixture('ghost-logo.svg'));
        assert.equal(await detectStorageContentType(gzippedSvg), undefined);
      });

      it('an empty buffer', async function () {
        assert.equal(await detectStorageContentType(Buffer.alloc(0)), undefined);
      });
    });

    describe('security: a type is never upgraded to an executable one', function () {
      // Detection decides what a stored file is served as, so it must never
      // turn contents into something a browser will run
      it('HTML markup is not served as HTML', async function () {
        const html = Buffer.from('<!DOCTYPE html><script>alert(document.domain)</script>');

        assert.equal(await detectStorageContentType(html), undefined);
        assert.notEqual(await detectStorageContentType(html), 'text/html');
      });

      it('a script is not served as JavaScript', async function () {
        const js = Buffer.from('alert(document.domain)');

        assert.equal(await detectStorageContentType(js), undefined);
      });

      it('a stylesheet is not served as CSS', async function () {
        assert.equal(await detectStorageContentType(Buffer.from('body{color:red}')), undefined);
      });

      it('SVG markup carrying a script is not served as markup', async function () {
        // SVGs are sanitized on the way in; detection must not hand one a
        // type that would get it parsed as a document
        const svg = Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        );

        assert.equal(await detectStorageContentType(svg), undefined);
      });

      it('an image with a script appended is still served as that image', async function () {
        // A polyglot is a real image to the detector, and serving it as one
        // is what stops the appended markup being parsed
        const polyglot = Buffer.concat([
          fixture('loadingcat.gif'),
          Buffer.from('<script>alert(document.domain)</script>'),
        ]);

        assert.equal(await detectStorageContentType(polyglot), 'image/gif');
      });

      it('an executable binary is served as a download', async function () {
        // ELF header
        const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(128)]);

        assert.equal(await detectStorageContentType(elf), 'application/octet-stream');
      });

      it('never returns a type outside what it has read', async function () {
        // Every answer is either an image the detector confirmed, a type on
        // the renderable list, octet-stream, or nothing at all
        const inputs = [
          fixture('ghosticon.jpg'),
          fixture('ghost-logo.svg'),
          Buffer.from('<!DOCTYPE html><h1>hi</h1>'),
          Buffer.from('{"a":1}'),
          Buffer.alloc(0),
        ];

        for (const input of inputs) {
          const result = await detectStorageContentType(input);
          const safe =
            result === undefined ||
            result === 'application/octet-stream' ||
            result.startsWith('image/') ||
            result === 'application/pdf' ||
            result === 'application/json' ||
            result === 'text/plain' ||
            result.startsWith('audio/') ||
            result.startsWith('video/') ||
            result.startsWith('font/');

          assert.ok(safe, `unexpected content type: ${result}`);
        }
      });
    });

    describe('detection never fails a write', function () {
      it('returns undefined when the path cannot be read', async function () {
        assert.equal(await detectStorageContentType('/does/not/exist/clip.mp4'), undefined);
      });
    });
  });
});
