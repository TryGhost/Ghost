const assert = require('node:assert/strict');
const path = require('path');
const ImporterContentFileHandler = require('../../../../../../core/server/data/importer/handlers/importer-content-file-handler');

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
                    // Simulate real getUniqueFileName behavior using path.join
                    getUniqueFileName: (file, targetDir) => Promise.resolve(path.join(targetDir, path.basename(file.name)))
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

            await contentFileImporter.loadFile(files, subDir);

            assert.equal(files[0].name, '1.mp4');
            assert.equal(files[0].originalPath, 'content/media/1.mp4');
            // targetDir is now relative (just the directory part, not absolute)
            assert.equal(files[0].targetDir, '.');
            assert.equal(files[0].newPath, '//blog/content/media/1.mp4');
        });

        it('loads files and decorates them with newPath with NO subdirectory', async function () {
            const contentFileImporter = new ImporterContentFileHandler({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(path.join(targetDir, path.basename(file.name)))
                },
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
            assert.equal(files[0].targetDir, '.');
            assert.equal(files[0].newPath, '//blog/content/media/1.mp4');
        });

        it('preserves date subdirectories in targetDir', async function () {
            const contentFileImporter = new ImporterContentFileHandler({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(path.join(targetDir, path.basename(file.name)))
                },
                urlUtils: {
                    getSubdir: () => 'blog',
                    urlJoin: (...args) => args.join('/')
                }
            });

            const files = [{
                name: 'content/media/2026/01/video.mp4'
            }];

            await contentFileImporter.loadFile(files);

            assert.equal(files[0].name, '2026/01/video.mp4');
            assert.equal(files[0].originalPath, 'content/media/2026/01/video.mp4');
            // targetDir preserves the date path structure
            assert.equal(files[0].targetDir, '2026/01');
            assert.equal(files[0].newPath, '//blog/content/media/2026/01/video.mp4');
        });

        it('ignores files in root folder', async function () {
            const contentFileImporter = new ImporterContentFileHandler({
                storage: {
                    staticFileURLPrefix: 'content/media',
                    getUniqueFileName: (file, targetDir) => Promise.resolve(path.join(targetDir, path.basename(file.name)))
                },
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
            assert.equal(files[1].targetDir, '.');
            assert.equal(files[1].newPath, '//blog/content/media/1.mp4');
        });
    });
});
