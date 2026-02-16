const assert = require('node:assert/strict');
const path = require('path');
const http = require('http');
const express = require('express');
const should = require('should');
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
        it('returns relative path from url (matches S3Storage behavior)', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                siteUrl: 'http://example.com/blog/'
            });

            // urlToPath now returns relative path, not absolute path
            // This matches S3Storage behavior and allows callers to pass result to save/exists/delete
            assert.equal(localStorageBase.urlToPath('http://example.com/blog/content/media/2021/11/media.mp4'), '2021/11/media.mp4');
        });

        it('throws if the url does not match current site', function () {
            let localStorageBase = new LocalStorageBase({
                storagePath: '/media-storage/path/',
                staticFileURLPrefix: 'content/media',
                url: 'http://example.com/blog/'
            });

            try {
                localStorageBase.urlToPath('http://anothersite.com/blog/content/media/2021/11/media.mp4');
                assert.fail('urlToPath when urls do not match');
            } catch (error) {
                assert.equal(error.message, 'The URL "http://anothersite.com/blog/content/media/2021/11/media.mp4" is not a valid URL for this site.');
            }
        });
    });

    describe('relative path handling', function () {
        afterEach(function () {
            sinon.restore();
        });

        describe('save', function () {
            it('prepends storagePath when targetDir is relative', async function () {
                const localStorageBase = new LocalStorageBase({
                    storagePath: '/var/www/ghost/content/media',
                    staticFileURLPrefix: 'content/media',
                    siteUrl: 'http://example.com/'
                });

                sinon.stub(localStorageBase, 'getUniqueFileName').resolves('/var/www/ghost/content/media/2026/01/video.mp4');
                sinon.stub(fs, 'mkdirs').resolves();
                sinon.stub(fs, 'copy').resolves();

                const url = await localStorageBase.save({
                    path: '/tmp/video.mp4',
                    name: 'video.mp4'
                }, '2026/01');

                // Verify getUniqueFileName was called with the absolute path
                assert.ok(localStorageBase.getUniqueFileName.calledOnce);
                const [, targetDir] = localStorageBase.getUniqueFileName.firstCall.args;
                assert.equal(targetDir, '/var/www/ghost/content/media/2026/01');

                // Verify the URL is correct
                assert.equal(url, '/content/media/2026/01/video.mp4');
            });

            it('does not double-prepend when targetDir already includes storagePath', async function () {
                const localStorageBase = new LocalStorageBase({
                    storagePath: '/var/www/ghost/content/media',
                    staticFileURLPrefix: 'content/media',
                    siteUrl: 'http://example.com/'
                });

                sinon.stub(localStorageBase, 'getUniqueFileName').resolves('/var/www/ghost/content/media/2026/01/video.mp4');
                sinon.stub(fs, 'mkdirs').resolves();
                sinon.stub(fs, 'copy').resolves();

                await localStorageBase.save({
                    path: '/tmp/video.mp4',
                    name: 'video.mp4'
                }, '/var/www/ghost/content/media/2026/01');

                // Verify getUniqueFileName was called with the original path (unchanged)
                const [, targetDir] = localStorageBase.getUniqueFileName.firstCall.args;
                assert.equal(targetDir, '/var/www/ghost/content/media/2026/01');
            });
        });

        describe('exists', function () {
            it('prepends storagePath when targetDir is relative', async function () {
                const localStorageBase = new LocalStorageBase({
                    storagePath: '/var/www/ghost/content/media',
                    staticFileURLPrefix: 'content/media',
                    siteUrl: 'http://example.com/'
                });

                const statStub = sinon.stub(fs, 'stat').resolves({});

                await localStorageBase.exists('video.mp4', '2026/01');

                // Verify fs.stat was called with the correct absolute path
                assert.ok(statStub.calledOnce);
                assert.equal(statStub.firstCall.args[0], '/var/www/ghost/content/media/2026/01/video.mp4');
            });
        });

        describe('delete', function () {
            it('prepends storagePath when targetDir is relative', async function () {
                const localStorageBase = new LocalStorageBase({
                    storagePath: '/var/www/ghost/content/media',
                    staticFileURLPrefix: 'content/media',
                    siteUrl: 'http://example.com/'
                });

                const removeStub = sinon.stub(fs, 'remove').resolves();

                await localStorageBase.delete('video.mp4', '2026/01');

                // Verify fs.remove was called with the correct absolute path
                assert.ok(removeStub.calledOnce);
                assert.equal(removeStub.firstCall.args[0], '/var/www/ghost/content/media/2026/01/video.mp4');
            });
        });
    });
});
