const assert = require('assert/strict');
const path = require('path');
const http = require('http');
const express = require('express');
const sinon = require('sinon');
const fs = require('fs-extra');
const LocalStorageBase = require('../../../../../core/server/adapters/storage/LocalStorageBase');

describe('Local Storage Base', function () {
    describe('serve', function () {
        it('returns a 416 RangeNotSatisfiableError if given an invalid range', function (done) {
            const localStorageBase = new LocalStorageBase({
                storagePath: path.resolve(__dirname, 'media-storage'),
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            const req = new http.IncomingMessage();
            const res = new http.ServerResponse(req);

            Object.setPrototypeOf(req, express.request);
            Object.setPrototypeOf(res, express.response);

            req.method = 'GET';
            req.url = '/content/media/image.jpg';
            req.headers = {
                range: 'bytes=1000-999'
            };

            localStorageBase.serve()(req, res, (err) => {
                assert.equal(err.errorType, 'RangeNotSatisfiableError');
                done();
            });
        });
    });

    describe('urlToPath', function () {
        it('returns relative path from full url', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            assert.equal(
                localStorageBase.urlToPath('http://example.com/blog/content/media/2021/11/media.mp4'),
                '2021/11/media.mp4'
            );
        });

        it('returns relative path from prefix url', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/'
            });

            assert.equal(
                localStorageBase.urlToPath('/content/media/2021/11/media.mp4'),
                '2021/11/media.mp4'
            );
        });

        it('throws if the url resolves outside the storage root', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            assert.throws(() => {
                localStorageBase.urlToPath('http://example.com/blog/content/media/2021/11/../../../../../../etc/passwd');
            }, {message: 'The URL "http://example.com/blog/content/media/2021/11/../../../../../../etc/passwd" is not a valid URL for this site.'});
        });

        it('throws if the prefix url resolves outside the storage root', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/'
            });

            assert.throws(() => {
                localStorageBase.urlToPath('/content/media/../../etc/passwd');
            }, {message: 'The URL "/content/media/../../etc/passwd" is not a valid URL for this site.'});
        });

        it('throws if the url does not match current site', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            assert.throws(() => {
                localStorageBase.urlToPath('http://anothersite.com/blog/content/media/2021/11/media.mp4');
            }, {message: 'The URL "http://anothersite.com/blog/content/media/2021/11/media.mp4" is not a valid URL for this site.'});
        });
    });

    describe('path validation', function () {
        it('read rejects if the path resolves outside the storage root', async function () {
            const localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            await assert.rejects(
                localStorageBase.read({path: '../../outside-root.txt'}),
                {message: 'The path "../../outside-root.txt" is not valid for this storage.'}
            );
        });

        it('exists returns false if the path resolves outside the storage root', async function () {
            const localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            await assert.doesNotReject(async function () {
                const exists = await localStorageBase.exists('../../outside-root.txt');
                assert.equal(exists, false);
            });
        });

        it('read rejects dot-equivalent paths', async function () {
            const localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            await assert.rejects(
                localStorageBase.read({path: 'foo/..'}),
                {message: 'The path "foo/.." is not valid for this storage.'}
            );
        });

        it('exists returns false for dot-equivalent paths', async function () {
            const localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            const exists = await localStorageBase.exists('.');
            assert.equal(exists, false);
        });

        it('delete rejects dot-equivalent paths', async function () {
            const localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            await assert.rejects(
                localStorageBase.delete(''),
                {message: 'The path "" is not valid for this storage.'}
            );
        });

        it('exists rejects when targetDir resolves outside storage root via traversal', async function () {
            // Stub fs.stat to always succeed so we can detect traversal
            // rather than having it masked by file-not-found
            const statStub = sinon.stub(fs, 'stat').resolves({});

            try {
                const localStorageBase = new LocalStorageBase({
                    storagePath: '/media-storage/path/',
                    staticFileURLPrefix: 'content/media',
                    siteUrl: 'http://example.com/blog/'
                });

                // targetDir traverses out of storage root — should return false, not attempt access
                const exists = await localStorageBase.exists('file.txt', '../../etc');
                assert.equal(exists, false, 'should be false because the path escapes the storage root');
            } finally {
                statStub.restore();
            }
        });

        it('exists rejects when targetDir prefix-matches but is not inside storage root', async function () {
            const statStub = sinon.stub(fs, 'stat').resolves({});

            try {
                const localStorageBase = new LocalStorageBase({
                    storagePath: '/media-storage/path',
                    staticFileURLPrefix: 'content/media',
                    siteUrl: 'http://example.com/blog/'
                });

                // targetDir starts with storagePath string but is a sibling directory
                // naive startsWith would treat this as already absolute + inside root
                const exists = await localStorageBase.exists('file.txt', '/media-storage/path-evil');
                assert.equal(exists, false, 'should be false because path-evil is not inside path/');
            } finally {
                statStub.restore();
            }
        });

        it('delete rejects when targetDir resolves outside storage root', async function () {
            const localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            await assert.rejects(
                localStorageBase.delete('file.txt', '../../etc'),
                {message: 'The path "file.txt" is not valid for this storage.'}
            );
        });
    });
});
