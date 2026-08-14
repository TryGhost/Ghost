import assert from 'node:assert/strict';
import {
    ThemeUploadError,
    downloadThemeArchive,
    fetchActiveThemeName,
    formatUploadErrors,
    uploadThemeArchive
} from '../src/edit-mode/theme-api.js';
import {extractThemeArchive, packThemeArchive} from '@tryghost/theme-renderer/editor/archive';

const ADMIN_URL = 'https://site.example.com/ghost/';

function jsonResponse(payload, {status = 200} = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {'content-type': 'application/json'}
    });
}

/** A tiny real theme zip, built through the shared packer. */
async function buildFixtureArchive() {
    return packThemeArchive({
        rootPrefix: 'fixture-theme/',
        files: {
            'index.hbs': {
                path: 'index.hbs',
                editable: true,
                content: '<main><h1 data-something>{{title}}</h1></main>',
                binary: null,
                date: new Date('2026-08-14T00:00:00.000Z'),
                unixPermissions: null,
                dosPermissions: null
            },
            'package.json': {
                path: 'package.json',
                editable: true,
                content: JSON.stringify({name: 'fixture-theme'}),
                binary: null,
                date: new Date('2026-08-14T00:00:00.000Z'),
                unixPermissions: null,
                dosPermissions: null
            }
        }
    });
}

describe('edit-mode theme-api', function () {
    describe('fetchActiveThemeName', function () {
        it('requests /themes/active/ with credentials and returns the name', async function () {
            const calls = [];
            const fetchImpl = async (url, options) => {
                calls.push({url, options});
                return jsonResponse({themes: [{name: 'casper', active: true}]});
            };

            const name = await fetchActiveThemeName(ADMIN_URL, fetchImpl);

            assert.equal(name, 'casper');
            assert.equal(calls.length, 1);
            assert.equal(calls[0].url, 'https://site.example.com/ghost/api/admin/themes/active/');
            assert.equal(calls[0].options.credentials, 'include');
        });

        it('throws on a non-OK response', async function () {
            const fetchImpl = async () => new Response('nope', {status: 403});

            await assert.rejects(fetchActiveThemeName(ADMIN_URL, fetchImpl), /edit_mode_active_theme_failed:403/);
        });

        it('throws when the response carries no theme', async function () {
            const fetchImpl = async () => jsonResponse({themes: []});

            await assert.rejects(fetchActiveThemeName(ADMIN_URL, fetchImpl), /edit_mode_active_theme_missing/);
        });
    });

    describe('downloadThemeArchive', function () {
        it('downloads the zip with credentials and round-trips through extractThemeArchive', async function () {
            const fixture = await buildFixtureArchive();
            const calls = [];
            const fetchImpl = async (url, options) => {
                calls.push({url, options});
                return new Response(fixture, {
                    status: 200,
                    headers: {'content-type': 'application/zip'}
                });
            };

            const arrayBuffer = await downloadThemeArchive(ADMIN_URL, 'fixture-theme', fetchImpl);
            const snapshot = await extractThemeArchive(arrayBuffer);

            assert.equal(calls[0].url, 'https://site.example.com/ghost/api/admin/themes/fixture-theme/download/');
            assert.equal(calls[0].options.credentials, 'include');
            assert.match(calls[0].options.headers.Accept, /application\/zip/);
            assert.equal(snapshot.rootPrefix, 'fixture-theme/');
            assert.equal(snapshot.files['index.hbs'].content, '<main><h1 data-something>{{title}}</h1></main>');
        });

        it('encodes the theme name into the download URL', async function () {
            const fixture = await buildFixtureArchive();
            const calls = [];
            const fetchImpl = async (url) => {
                calls.push(url);
                return new Response(fixture, {status: 200});
            };

            await downloadThemeArchive(ADMIN_URL, 'my theme', fetchImpl);

            assert.equal(calls[0], 'https://site.example.com/ghost/api/admin/themes/my%20theme/download/');
        });

        it('throws on a non-OK response', async function () {
            const fetchImpl = async () => new Response('gone', {status: 404});

            await assert.rejects(downloadThemeArchive(ADMIN_URL, 'casper', fetchImpl), /edit_mode_theme_download_failed:404/);
        });
    });

    describe('uploadThemeArchive', function () {
        it('POSTs the zip as multipart field "file" named <themeName>.zip', async function () {
            const blob = await buildFixtureArchive();
            const calls = [];
            const fetchImpl = async (url, options) => {
                calls.push({url, options});
                return jsonResponse({themes: [{name: 'fixture-theme'}]});
            };

            const uploaded = await uploadThemeArchive(ADMIN_URL, {themeName: 'fixture-theme', blob}, fetchImpl);

            assert.equal(uploaded.name, 'fixture-theme');
            assert.equal(calls[0].url, 'https://site.example.com/ghost/api/admin/themes/upload/');
            assert.equal(calls[0].options.method, 'POST');
            assert.equal(calls[0].options.credentials, 'include');

            const file = calls[0].options.body.get('file');
            assert.ok(file, 'multipart body should carry a "file" field');
            // the zip FILENAME determines the installed theme name
            assert.equal(file.name, 'fixture-theme.zip');

            // and the uploaded bytes must still be a valid theme archive
            const snapshot = await extractThemeArchive(await file.arrayBuffer());
            assert.equal(snapshot.files['package.json'].content, JSON.stringify({name: 'fixture-theme'}));
        });

        it('surfaces gscan 422 errors as a readable ThemeUploadError', async function () {
            const blob = await buildFixtureArchive();
            const fetchImpl = async () => jsonResponse({
                errors: [{
                    message: 'Theme is not compatible or contains errors.',
                    context: 'Templates must contain valid Handlebars',
                    failures: [
                        {ref: 'index.hbs', message: 'Parse error on line 4'},
                        {ref: 'package.json', message: 'name is required'}
                    ]
                }]
            }, {status: 422});

            await assert.rejects(
                uploadThemeArchive(ADMIN_URL, {themeName: 'fixture-theme', blob}, fetchImpl),
                (error) => {
                    assert.ok(error instanceof ThemeUploadError);
                    assert.equal(error.status, 422);
                    assert.match(error.message, /failed validation/);
                    assert.match(error.message, /Theme is not compatible or contains errors\. — Templates must contain valid Handlebars/);
                    assert.match(error.message, /index\.hbs: Parse error on line 4/);
                    assert.match(error.message, /package\.json: name is required/);
                    return true;
                }
            );
        });

        it('throws a generic ThemeUploadError for non-422 failures', async function () {
            const blob = await buildFixtureArchive();
            const fetchImpl = async () => new Response('boom', {status: 500});

            await assert.rejects(
                uploadThemeArchive(ADMIN_URL, {themeName: 'fixture-theme', blob}, fetchImpl),
                (error) => {
                    assert.ok(error instanceof ThemeUploadError);
                    assert.equal(error.status, 500);
                    assert.match(error.message, /Theme upload failed \(500\)/);
                    return true;
                }
            );
        });
    });

    describe('formatUploadErrors', function () {
        it('flattens messages, contexts, and failures into lines', function () {
            const formatted = formatUploadErrors([
                {message: 'First error', context: 'some context'},
                {message: 'Second error', failures: [{ref: 'a.hbs', message: 'bad'}]}
            ]);

            assert.equal(formatted, 'First error — some context\nSecond error\n  • a.hbs: bad');
        });

        it('returns an empty string for an empty list', function () {
            assert.equal(formatUploadErrors([]), '');
        });
    });
});
