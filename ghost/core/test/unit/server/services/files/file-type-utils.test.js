const assert = require('node:assert/strict');
const {getStorageContentType} = require('../../../../../core/server/services/files/file-type-utils');

describe('file-type-utils', function () {
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

            it('.avif -> image/avif', function () {
                assert.equal(getStorageContentType('photo.avif'), 'image/avif');
            });

            it('.ico -> image/vnd.microsoft.icon', function () {
                assert.equal(getStorageContentType('favicon.ico'), 'image/vnd.microsoft.icon');
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
                const result = getStorageContentType('clip.wav');
                assert.ok(result === 'audio/wave' || result === 'audio/wav', `Expected audio/wave or audio/wav, got ${result}`);
            });

            it('.ogg -> audio/ogg', function () {
                assert.equal(getStorageContentType('clip.ogg'), 'audio/ogg');
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

            it('.webm -> video/webm', function () {
                assert.equal(getStorageContentType('video.webm'), 'video/webm');
            });

            it('.woff -> font/woff', function () {
                assert.equal(getStorageContentType('font.woff'), 'font/woff');
            });

            it('.woff2 -> font/woff2', function () {
                assert.equal(getStorageContentType('font.woff2'), 'font/woff2');
            });

            it('.ttf -> font/ttf', function () {
                assert.equal(getStorageContentType('font.ttf'), 'font/ttf');
            });

            it('.otf -> font/otf', function () {
                assert.equal(getStorageContentType('font.otf'), 'font/otf');
            });
        });

        describe('executable types are never returned as browser-renderable', function () {
            it('text/html is not renderable (tested via .html override)', function () {
                assert.equal(getStorageContentType('page.html'), 'text/plain');
                assert.notEqual(getStorageContentType('page.html'), 'text/html');
            });

            it('application/javascript is not renderable (tested via .js override)', function () {
                assert.equal(getStorageContentType('app.js'), 'text/plain');
                assert.notEqual(getStorageContentType('app.js'), 'application/javascript');
            });

            it('text/css is not renderable (tested via .css override)', function () {
                assert.equal(getStorageContentType('styles.css'), 'text/plain');
                assert.notEqual(getStorageContentType('styles.css'), 'text/css');
            });

            it('image/svg+xml is not renderable (tested via .svg override)', function () {
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

            it('.svg (use /images/upload for rendering)', function () {
                assert.equal(getStorageContentType('logo.svg'), 'application/octet-stream');
            });

            it('.svgz (use /images/upload for rendering)', function () {
                assert.equal(getStorageContentType('logo.svgz'), 'application/octet-stream');
            });

            it('.apkg (niche, unknown to mime-types)', function () {
                assert.equal(getStorageContentType('flashcards.apkg'), 'application/octet-stream');
            });

            it('.ipynb (niche, unknown to mime-types)', function () {
                assert.equal(getStorageContentType('notebook.ipynb'), 'application/octet-stream');
            });

            it('.paprikarecipes (niche, unknown to mime-types)', function () {
                assert.equal(getStorageContentType('dinner.paprikarecipes'), 'application/octet-stream');
            });

            it('unknown extension', function () {
                assert.equal(getStorageContentType('file.randomjunk'), 'application/octet-stream');
            });
        });
    });
});
