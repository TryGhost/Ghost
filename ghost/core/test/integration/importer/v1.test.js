const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const {exportedBodyV1} = require('../../utils/fixtures/export/body-generator');

const models = require('../../../core/server/models');
const importer = require('../../../core/server/data/importer');
const dataImporter = importer.importers.find((instance) => {
    return instance.type === 'data';
});

const importOptions = {
    returnImportedData: true
};

// v1 exports predate lexical: post content is mobiledoc, typically a single markdown card
const markdownToMobiledoc = (content) => {
    return JSON.stringify({
        version: '0.3.1',
        markups: [],
        atoms: [],
        cards: [['markdown', {markdown: content || ''}]],
        sections: [[10, 0]]
    });
};

describe('Importer 1.0', function () {
    beforeEach(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles', 'owner'));

    it('ensure amp field get\'s respected', function () {
        const exportData = exportedBodyV1().db[0];

        exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
            slug: 'post1',
            amp: 2
        });

        exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
            slug: 'post2',
            amp: null
        });

        return dataImporter.doImport(exportData, importOptions)
            .then(function () {
                return Promise.all([
                    models.Post.findPage(testUtils.context.internal)
                ]);
            }).then(function (result) {
                const posts = result[0].data.map(model => model.toJSON());

                assert.equal(posts.length, 2);
                assert.equal(posts[0].comment_id, exportData.data.posts[1].id);
                assert.equal(posts[1].comment_id, '2');
            });
    });

    describe('migrate mobiledoc/html', function () {
        it('invalid mobiledoc structure', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: 'test',
                mobiledoc: '{}'
            });

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2',
                mobiledoc: markdownToMobiledoc('## markdown')
            });

            exportData.data.posts[1].mobiledoc = '{';
            const options = Object.assign({formats: 'mobiledoc,lexical,html'}, testUtils.context.internal);

            const blankLexical = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    // invalid mobiledoc is replaced with a blank document and converted to lexical
                    assert.equal(posts.length, 2);
                    assert.equal(posts[0].html, null);
                    assert.equal(posts[0].mobiledoc, null);
                    assert.equal(posts[0].lexical, blankLexical);

                    assert.equal(posts[1].html, null);
                    assert.equal(posts[1].mobiledoc, null);
                    assert.equal(posts[1].lexical, blankLexical);
                });
        });

        it('mobiledoc is null, html field is set, convert html -> lexical', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: '<div><h1>This is my post content.</h1></div>'
            });

            exportData.data.posts[0].mobiledoc = null;
            exportData.data.posts[0].lexical = null;

            const options = Object.assign({formats: 'mobiledoc,lexical,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    assert.equal(posts.length, 1);
                    assert.equal(posts[0].html, '<h1 id="this-is-my-post-content">This is my post content.</h1>');
                    assert.equal(posts[0].mobiledoc, null);
                    assert.equal(posts[0].lexical, '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is my post content.","type":"extended-text","version":1}],"direction":null,"format":"","indent":0,"type":"extended-heading","version":1,"tag":"h1"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
                });
        });

        it('mobiledoc, lexical, and html is null', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1'
            });

            exportData.data.posts[0].mobiledoc = null;
            exportData.data.posts[0].lexical = null;
            exportData.data.posts[0].html = null;

            const options = Object.assign({formats: 'mobiledoc,lexical,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    assert.equal(posts.length, 1);
                    assert.equal(posts[0].html, null);
                    assert.equal(posts[0].mobiledoc, null);
                    assert.equal(posts[0].lexical, '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
                });
        });

        it('mobiledoc is set and html is null', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                mobiledoc: markdownToMobiledoc('## markdown')
            });

            exportData.data.posts[0].html = null;

            const options = Object.assign({formats: 'mobiledoc,lexical,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    // mobiledoc is converted to lexical, the markdown card becomes a markdown node
                    assert.equal(posts.length, 1);
                    assert.equal(posts[0].html, '<h2 id="markdown">markdown</h2>\n');
                    assert.equal(posts[0].mobiledoc, null);
                    assert.equal(posts[0].lexical, '{"root":{"children":[{"type":"markdown","markdown":"## markdown"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
                });
        });

        it('post has "kg-card-markdown" class', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: '<div class="kg-card-markdown"><h1>This is my post content.</h1></div>',
                mobiledoc: markdownToMobiledoc('# This is my post content')
            });

            const options = Object.assign({formats: 'mobiledoc,lexical,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    // mobiledoc takes precedence over html and is converted to lexical
                    assert.equal(posts.length, 1);
                    assert.equal(posts[0].html, '<h1 id="this-is-my-post-content">This is my post content</h1>\n');
                    assert.equal(posts[0].mobiledoc, null);
                    assert.equal(posts[0].lexical, '{"root":{"children":[{"type":"markdown","markdown":"# This is my post content"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
                });
        });

        it('import old Koenig Beta post format', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    markups: [],
                    atoms: [],
                    cards: [
                        ['image', {
                            imageStyle: 'wide',
                            src: 'source'
                        }],
                        ['markdown', {
                            markdown: '# Post Content'
                        }]
                    ],
                    sections: [[10,0],[10,1]]
                })
            });

            delete exportData.data.posts[0].html;

            exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post2',
                mobiledoc: JSON.stringify({
                    version: '0.3.1',
                    markups: [],
                    atoms: [],
                    cards: [
                        ['markdown', {
                            markdown: '## Post Content'
                        }],
                        ['image', {
                            imageStyle: 'not-wide',
                            src: 'source2'
                        }]
                    ],
                    sections: [[10,0],[10,1]]
                }),
                html: '<div class="kg-post"><h2 id="postcontent">Post Content</h2></div>\n'
            });

            const options = Object.assign({formats: 'mobiledoc,lexical,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    // mobiledoc is converted to lexical, the legacy imageStyle is normalised to
                    // cardWidth before conversion
                    assert.equal(posts.length, 2);

                    assert.equal(posts[0].mobiledoc, null);
                    assert.equal(posts[0].lexical, '{"root":{"children":[{"type":"markdown","markdown":"## Post Content"},{"type":"image","src":"source2","cardWidth":"not-wide"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
                    assert.equal(posts[0].html, '<h2 id="post-content">Post Content</h2>\n<figure class="kg-card kg-image-card kg-width-not-wide"><img src="source2" class="kg-image" alt="" loading="lazy"></figure>');

                    assert.equal(posts[1].mobiledoc, null);
                    assert.equal(posts[1].lexical, '{"root":{"children":[{"type":"image","src":"source","cardWidth":"wide"},{"type":"markdown","markdown":"# Post Content"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
                    assert.equal(posts[1].html, '<figure class="kg-card kg-image-card kg-width-wide"><img src="source" class="kg-image" alt="" loading="lazy"></figure><h1 id="post-content">Post Content</h1>\n');
                });
        });
    });
});
