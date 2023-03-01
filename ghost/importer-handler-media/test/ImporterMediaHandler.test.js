const assert = require('assert');
const sinon = require('sinon');
const ImporterMedia = require('../index');

describe('ImporterMediaHandler', function () {
    it('creates an instance', function () {
        const mediaImporter = new ImporterMedia({
            storage: {},
            config: {},
            urlUtils: {}
        });

        assert.ok(mediaImporter);
        assert.equal(mediaImporter.type, 'media');
    });

    it('returns configured extensions', function () {
        const mediaImporter = new ImporterMedia({
            storage: {},
            config: {
                get: () => ({
                    media: {
                        extensions: ['mp4']
                    }
                })
            },
            urlUtils: {}
        });

        assert.deepEqual(mediaImporter.extensions, ['mp4']);
    });

    it('returns configured contentTypes', function () {
        const mediaImporter = new ImporterMedia({
            storage: {},
            config: {
                get: () => ({
                    media: {
                        contentTypes: ['video/mp4']
                    }
                })
            },
            urlUtils: {}
        });

        assert.deepEqual(mediaImporter.contentTypes, ['video/mp4']);
    });

    // @NOTE: below tests need more work, they are just covering the basics
    //        the cases are based on a fact that the implementation was a copy
    //        from the image importer and the tests were adapted to the media importer
    describe('loadFile', function () {
        it('loads files and decorates them with newPath with subdirectory', async function () {
            const mediaImporter = new ImporterMedia({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(targetDir + '/' + file.name)
                },
                config: {
                    getContentPath: sinon.stub()
                        .withArgs('media')
                        .returns('/var/www/ghost/content/media')
                },
                urlUtils: {
                    getSubdir: () => 'blog',
                    urlJoin: (...args) => args.join('/')
                }
            });

            const files = [{
                name: 'content/media/1.mp4'
            }];
            const subDir = 'blog';

            await mediaImporter.loadFile(files, subDir);

            assert.equal(files[0].name, '1.mp4');
            assert.equal(files[0].originalPath, 'content/media/1.mp4');
            assert.equal(files[0].targetDir, '/var/www/ghost/content/media');
            assert.equal(files[0].newPath, '//blog/content/media/1.mp4');
        });

        it('loads files and decorates them with newPath with NO subdirectory', async function () {
            const mediaImporter = new ImporterMedia({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(targetDir + '/' + file.name)
                },
                config: {
                    getContentPath: sinon.stub()
                        .withArgs('media')
                        .returns('/var/www/ghost/content/media')
                },
                urlUtils: {
                    getSubdir: () => 'blog',
                    urlJoin: (...args) => args.join('/')
                }
            });

            const files = [{
                name: 'content/media/1.mp4'
            }];

            await mediaImporter.loadFile(files);

            assert.equal(files[0].name, '1.mp4');
            assert.equal(files[0].originalPath, 'content/media/1.mp4');
            assert.equal(files[0].targetDir, '/var/www/ghost/content/media');
            assert.equal(files[0].newPath, '//blog/content/media/1.mp4');
        });
    });
});
