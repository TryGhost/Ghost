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

                posts.length.should.eql(2);
                posts[0].comment_id.should.eql(exportData.data.posts[1].id);
                posts[1].comment_id.should.eql('2');
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
                slug: 'post2'
            });

            exportData.data.posts[1].mobiledoc = '{';
            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(2);
                    should(posts[0].html).eql(null);
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","ghostVersion":"4.0","markups":[],"atoms":[],"cards":[],"sections":[[1,"p",[[0,[],0,""]]]]}');

                    should(posts[1].html).eql(null);
                    posts[1].mobiledoc.should.eql('{"version":"0.3.1","ghostVersion":"4.0","markups":[],"atoms":[],"cards":[],"sections":[[1,"p",[[0,[],0,""]]]]}');
                });
        });

        it('mobiledoc is null, html field is set, convert html -> mobiledoc', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: '<div><h1>This is my post content.</h1></div>'
            });

            exportData.data.posts[0].mobiledoc = null;

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    should(posts[0].html).eql('<h1 id="this-is-my-post-content">This is my post content.</h1>');
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"h1",[[0,[],0,"This is my post content."]]]]}');
                });
        });

        it('mobiledoc and html is null', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1'
            });

            exportData.data.posts[0].mobiledoc = null;
            exportData.data.posts[0].html = null;

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    should(posts[0].html).eql(null);
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","ghostVersion":"4.0","markups":[],"atoms":[],"cards":[],"sections":[[1,"p",[[0,[],0,""]]]]}');
                });
        });

        it('mobiledoc is set and html is null', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1'
            });

            exportData.data.posts[0].html = null;

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    posts[0].html.should.eql('<!--kg-card-begin: markdown--><h2 id="markdown">markdown</h2>\n<!--kg-card-end: markdown-->');
                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"markdown":"## markdown"}]],"sections":[[10,0]],"ghostVersion":"3.0"}');
                });
        });

        it('post has "kg-card-markdown" class', function () {
            const exportData = exportedBodyV1().db[0];

            exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
                slug: 'post1',
                html: '<div class="kg-card-markdown"><h1>This is my post content.</h1></div>',
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('# This is my post content')
            });

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(1);
                    posts[0].html.should.eql('<!--kg-card-begin: markdown--><h1 id="thisismypostcontent">This is my post content</h1>\n<!--kg-card-end: markdown-->');
                    const expectedMobiledoc = JSON.parse(exportData.data.posts[0].mobiledoc);
                    expectedMobiledoc.ghostVersion = '3.0';
                    posts[0].mobiledoc.should.eql(JSON.stringify(expectedMobiledoc));
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

            const options = Object.assign({formats: 'mobiledoc,html'}, testUtils.context.internal);

            return dataImporter.doImport(exportData, importOptions)
                .then(function () {
                    return Promise.all([
                        models.Post.findPage(options)
                    ]);
                }).then(function (result) {
                    const posts = result[0].data.map(model => model.toJSON(options));

                    posts.length.should.eql(2);

                    posts[0].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["markdown",{"markdown":"## Post Content"}],["image",{"src":"source2","cardWidth":"not-wide"}]],"sections":[[10,0],[10,1]],"ghostVersion":"3.0"}');
                    posts[0].html.should.eql('<!--kg-card-begin: markdown--><h2 id="postcontent">Post Content</h2>\n<!--kg-card-end: markdown--><figure class="kg-card kg-image-card kg-width-not-wide"><img src="source2" class="kg-image" alt loading="lazy"></figure>');

                    posts[1].mobiledoc.should.eql('{"version":"0.3.1","markups":[],"atoms":[],"cards":[["image",{"src":"source","cardWidth":"wide"}],["markdown",{"markdown":"# Post Content"}]],"sections":[[10,0],[10,1]],"ghostVersion":"3.0"}');
                    posts[1].html.should.eql('<figure class="kg-card kg-image-card kg-width-wide"><img src="source" class="kg-image" alt loading="lazy"></figure><!--kg-card-begin: markdown--><h1 id="postcontent">Post Content</h1>\n<!--kg-card-end: markdown-->');
                });
        });
    });
});
