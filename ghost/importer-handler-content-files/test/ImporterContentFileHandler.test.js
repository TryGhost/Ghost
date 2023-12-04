const assert = require('assert/strict');
const ImporterContentFileHandler = require('../index');

describe('ImporterContentFileHandler', function () {
    it('creates an instance', function () {
        const contentFileImporter = new ImporterContentFileHandler({
            type: 'media',
            storage: {},
            config: {},
            urlUtils: {}
        });

        assert.ok(contentFileImporter);
        assert.equal(contentFileImporter.type, 'media');
    });

    it('returns configured extensions', function () {
        const contentFileImporter = new ImporterContentFileHandler({
            storage: {},
            extensions: ['mp4'],
            urlUtils: {}
        });

        assert.deepEqual(contentFileImporter.extensions, ['mp4']);
    });

    it('returns configured contentTypes', function () {
        const contentFileImporter = new ImporterContentFileHandler({
            storage: {},
            contentTypes: ['video/mp4'],
            urlUtils: {}
        });

        assert.deepEqual(contentFileImporter.contentTypes, ['video/mp4']);
    });

    // @NOTE: below tests need more work, they are just covering the basics
    //        the cases are based on a fact that the implementation was a copy
    //        from the image importer and the tests were adapted to the media importer
    describe('loadFile', function () {
        it('loads files and decorates them with newPath with subdirectory', async function () {
            const contentFileImporter = new ImporterContentFileHandler({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(targetDir + '/' + file.name)
                },
                contentPath: '/var/www/ghost/content/media',
                urlUtils: {
                    getSubdir: () => 'blog',
                    urlJoin: (...args) => args.join('/')
                }
            });

            const files = [{
                name: 'content/media/1.mp4'
            }];
            const subDir = 'blog';

            await contentFileImporter.loadFile(files, subDir);

            assert.equal(files[0].name, '1.mp4');
            assert.equal(files[0].originalPath, 'content/media/1.mp4');
            assert.equal(files[0].targetDir, '/var/www/ghost/content/media');
            assert.equal(files[0].newPath, '//blog/content/media/1.mp4');
        });

        it('loads files and decorates them with newPath with NO subdirectory', async function () {
            const contentFileImporter = new ImporterContentFileHandler({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(targetDir + '/' + file.name)
                },
                contentPath: '/var/www/ghost/content/media',
                urlUtils: {
                    getSubdir: () => 'blog',
                    urlJoin: (...args) => args.join('/')
                }
            });

            const files = [{
                name: 'content/media/1.mp4'
            }];

            await contentFileImporter.loadFile(files);

            assert.equal(files[0].name, '1.mp4');
            assert.equal(files[0].originalPath, 'content/media/1.mp4');
            assert.equal(files[0].targetDir, '/var/www/ghost/content/media');
            assert.equal(files[0].newPath, '//blog/content/media/1.mp4');
        });

        it('ignores files in root folder', async function () {
            const contentFileImporter = new ImporterContentFileHandler({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(targetDir + '/' + file.name)
                },
                contentPath: '/var/www/ghost/content/media',
                ignoreRootFolderFiles: true,
                urlUtils: {
                    getSubdir: () => 'blog',
                    urlJoin: (...args) => args.join('/')
                }
            });

            const files = [{
                name: 'root.mp4'
            }, {
                name: 'content/media/1.mp4'
            }];

            await contentFileImporter.loadFile(files);

            // @NOTE: the root file is ignored. It's a weird test because ideally the file
            //        should be removed completely from the list, but the importer works
            //        by modifying the list in place and it's not easy to remove the file
            assert.equal(files[0].name, 'root.mp4');
            assert.equal(files[0].originalPath, undefined);
            assert.equal(files[0].targetDir, undefined);
            assert.equal(files[0].newPath, undefined);

            assert.equal(files[1].name, '1.mp4');
            assert.equal(files[1].originalPath, 'content/media/1.mp4');
            assert.equal(files[1].targetDir, '/var/www/ghost/content/media');
            assert.equal(files[1].newPath, '//blog/content/media/1.mp4');
        });
    });
});
