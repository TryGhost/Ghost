const assert = require('assert/strict');
const sinon = require('sinon');
const RevueImporter = require('../index');

const JSONToHTML = require('../lib/json-to-html');

describe('Revue Importer', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('preProcess', function () {
        it('marks any object as processed', function () {
            let result;

            result = RevueImporter.preProcess({});
            assert.deepEqual(result.preProcessedByRevue, true, 'marks the object as processed');

            result = RevueImporter.preProcess({revue: {}});
            assert.deepEqual(result.preProcessedByRevue, true, 'marks the object as processed');

            result = RevueImporter.preProcess({data: {}});
            assert.deepEqual(result.preProcessedByRevue, true, 'marks the object as processed');
        });

        it('ignores empty revue object', function () {
            const result = RevueImporter.preProcess({revue: {}});
            assert.deepEqual(result.revue, {}, 'revue object left empty');
            assert.deepEqual(result.data, undefined, 'no data object set');
        });

        it('ignores empty nested revue object', function () {
            const result = RevueImporter.preProcess({revue: {revue: {}}});
            assert.deepEqual(result.revue.revue, {}, 'revue object left empty');
            assert.deepEqual(result.data, undefined, 'no data object set');
        });

        it('handles revue with issue and item data', function () {
            const result = RevueImporter.preProcess({revue: {revue: {issues: 'id', items: '{}'}}});
            assert.deepEqual(result.revue.revue, {issues: 'id', items: '{}'}, 'revue object left as-is');
            assert.deepEqual(result.data, {meta: {version: '5.0.0'}, data: {posts: []}}, 'data object is set');
        });

        it('handles revue with issue, item and subscribers data', function () {
            const result = RevueImporter.preProcess({revue: {revue: {issues: 'id', items: '{}', subscribers: 'email'}}});
            assert.deepEqual(result.revue.revue, {issues: 'id', items: '{}', subscribers: 'email'}, 'revue object left as-is');
            assert.deepEqual(result.data, {meta: {version: '5.0.0'}, data: {posts: [], revue_subscribers: []}}, 'data object is set');
        });
    });

    describe('doImport', function () {
        it('does nothing', function () {
            const result = RevueImporter.doImport({x: {y: 'z'}});
            assert.deepEqual(result, {x: {y: 'z'}}, 'is just a pass-through');
        });
    });

    describe('importPosts', function () {
        it('can process a published post without items', function () {
            const result = RevueImporter.importPosts({items: '[]', issues: 'id,description,sent_at,subject,preheader\n123456,"<p>Hello World!</p>",2022-12-01 01:01:30 UTC,Hello World - Issue #8,'});
            assert.deepEqual(result, [
                {
                    comment_id: 123456,
                    title: 'Hello World - Issue #8',
                    slug: 'hello-world-issue-8',
                    status: 'published',
                    visibility: 'public',
                    created_at: '2022-12-01T01:01:30.000Z',
                    published_at: '2022-12-01T01:01:30.000Z',
                    updated_at: '2022-12-01T01:01:30.000Z',
                    html: '<p>Hello World!</p>'
                }
            ]);
        });

        it('doesnt process a post with no subject', function () {
            const result = RevueImporter.importPosts({items: '[{"title":"","issue_id":123456,"item_type":"text","url":"","description":"\u003cp\u003eGoodbye World!\u003c/p\u003e","order":0}]', issues: 'id,description,sent_at,subject,preheader\n123456,"<p>Hello World!</p>",2022-12-01 01:01:30 UTC,,'});
            assert.deepEqual(result, []);
        });

        it('can process a published post with items', function () {
            const result = RevueImporter.importPosts({items: '[{"title":"","issue_id":123456,"item_type":"text","url":"","description":"\u003cp\u003eGoodbye World!\u003c/p\u003e","order":0}]', issues: 'id,description,sent_at,subject,preheader\n123456,"<p>Hello World!</p>",2022-12-01 01:01:30 UTC,Hello World - Issue #8,'});
            assert.deepEqual(result, [
                {
                    comment_id: 123456,
                    created_at: '2022-12-01T01:01:30.000Z',
                    html: '<p>Hello World!</p><p>Goodbye World!</p>',
                    published_at: '2022-12-01T01:01:30.000Z',
                    status: 'published',
                    title: 'Hello World - Issue #8',
                    slug: 'hello-world-issue-8',
                    updated_at: '2022-12-01T01:01:30.000Z',
                    visibility: 'public'
                }
            ]);
        });

        it('can process a draft post with items', function () {
            sinon.stub(JSONToHTML, 'getPostDate').returns('2022-12-01T01:02:03.123Z');

            const result = RevueImporter.importPosts({items: '[{"title":"","issue_id":123456,"item_type":"text","url":"","description":"\u003cp\u003eGoodbye World!\u003c/p\u003e","order":0}]', issues: 'id,description,sent_at,subject,preheader\n123456,"<p>Hello World!</p>",,Hello World - Issue #8,'});
            assert.deepEqual(result, [
                {
                    comment_id: 123456,
                    title: 'Hello World - Issue #8',
                    slug: 'hello-world-issue-8',
                    status: 'draft',
                    visibility: 'public',
                    created_at: '2022-12-01T01:02:03.123Z',
                    published_at: '2022-12-01T01:02:03.123Z',
                    updated_at: '2022-12-01T01:02:03.123Z',
                    html: '<p>Hello World!</p><p>Goodbye World!</p>'
                }
            ]);
        });

        it('can trim generated post slug length', function () {
            const result = RevueImporter.importPosts({items: '[]', issues: 'id,description,sent_at,subject,preheader\n123456,"<p>Hello World!</p>",2022-12-01 01:01:30 UTC,Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit Mauris Convallis Et Metus Eu Blandit Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit Ut Porta Dapibus Massa Condimentum Malesuada Ipsum Scelerisque Nec Vestibulum Sed Placerat Cras,'});

            assert.deepEqual(result, [
                {
                    comment_id: 123456,
                    title: 'Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit Mauris Convallis Et Metus Eu Blandit Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit Ut Porta Dapibus Massa Condimentum Malesuada Ipsum Scelerisque Nec Vestibulum Sed Placerat Cras',
                    slug: 'lorem-ipsum-dolor-sit-amet-consectetur-adipiscing-elit-mauris-convallis-et-metus-eu-blandit-lorem-ipsum-dolor-sit-amet-consectetur-adipiscing-elit-ut-porta-dapibus-massa-condimentum-malesuad',
                    status: 'published',
                    visibility: 'public',
                    created_at: '2022-12-01T01:01:30.000Z',
                    published_at: '2022-12-01T01:01:30.000Z',
                    updated_at: '2022-12-01T01:01:30.000Z',
                    html: '<p>Hello World!</p>'
                }
            ]);
        });
    });

    describe('importSubscribers', function () {
        it('can process a subscriber with only first name', function () {
            const result = RevueImporter.importSubscribers({subscribers: 'email,first_name,last_name,created_at\njoe@bloggs.me,Joe,"",2022-12-01 01:02:03.123457'});

            assert.deepEqual(result, [{email: 'joe@bloggs.me', name: 'Joe', created_at: '2022-12-01 01:02:03.123457', subscribed: true}]);
        });

        it('can process a subscriber with first and last name', function () {
            const result = RevueImporter.importSubscribers({subscribers: 'email,first_name,last_name,created_at\njoe@bloggs.me,Joe,Bloggs,2022-12-01 01:02:03.123457'});

            assert.deepEqual(result, [{email: 'joe@bloggs.me', name: 'Joe Bloggs', created_at: '2022-12-01 01:02:03.123457', subscribed: true}]);
        });

        it('can process multiple subscribers', function () {
            const result = RevueImporter.importSubscribers({subscribers: 'email,first_name,last_name,created_at\njoe@bloggs.me,Joe,Bloggs,2022-12-01 01:02:03.123457\njo@bloggs.me,Jo,Bloggs,2022-12-01 01:02:04.123457'});

            assert.deepEqual(result, [{email: 'joe@bloggs.me', name: 'Joe Bloggs', created_at: '2022-12-01 01:02:03.123457', subscribed: true},{email: 'jo@bloggs.me', name: 'Jo Bloggs', created_at: '2022-12-01 01:02:04.123457', subscribed: true}]);
        });
    });

    describe('JSONToHTML helpers', function () {
        describe('getPostData', function () {
            it('can get date for published post', function () {
                const result = JSONToHTML.getPostDate({sent_at: '2022-12-01 01:01:30 UTC'});

                assert.deepEqual(result, '2022-12-01T01:01:30.000Z');
            });

            it('can get date for draft post', function () {
                const clock = sinon.useFakeTimers(); // required because assertion could be 1ms off
                const result = JSONToHTML.getPostDate({});
                const expected = new Date().toISOString();
                clock.restore();

                assert.equal(result, expected);
            });
        });

        describe('getPostStatus', function () {
            it('can get date for published post', function () {
                const result = JSONToHTML.getPostStatus({sent_at: '2022-12-01 01:01:30 UTC'});

                assert.deepEqual(result, 'published');
            });

            it('can get date for draft post', function () {
                const result = JSONToHTML.getPostStatus({});

                assert.deepEqual(result, 'draft');
            });
        });

        describe('itemsToHtml', function () {
            it('can handle header item', function () {
                const result = JSONToHTML.itemsToHtml([{title: 'Hello World',issue_id: 123456,item_type: 'header',url: '',description: '',order: 0}]);

                assert.deepEqual(result, '<h3>Hello World</h3>');
            });

            it('can handle link item', function () {
                const result = JSONToHTML.itemsToHtml([{title: 'Google',issue_id: 123456,item_type: 'link',url: 'https://google.com/',description: 'A search engine.',order: 0,image: 'https://s3.amazonaws.com/revue/items/images/012/345/678/web/google.png?1234556'}]);

                assert.deepEqual(result, '<figure class="kg-card kg-image-card kg-card-hascaption"><a href="https://google.com/"><img src="https://s3.amazonaws.com/revue/items/images/012/345/678/web/google.png?1234556" class="kg-image" alt loading="lazy"></a><figcaption>Google</figcaption></figure>\n' +
                '<h4><a href="https://google.com/">Google</a></h4>A search engine.');
            });

            it('can handle link item with html in description', function () {
                const result = JSONToHTML.itemsToHtml([{title: 'Google',issue_id: 123456,item_type: 'link',url: 'https://google.com/',description: '<p>A <b>search</b> engine.</p>',order: 0,image: 'https://s3.amazonaws.com/revue/items/images/012/345/678/web/google.png?1234556'}]);

                assert.deepEqual(result, '<figure class="kg-card kg-image-card kg-card-hascaption"><a href="https://google.com/"><img src="https://s3.amazonaws.com/revue/items/images/012/345/678/web/google.png?1234556" class="kg-image" alt loading="lazy"></a><figcaption>Google</figcaption></figure>\n' +
                '<h4><a href="https://google.com/">Google</a></h4><p>A <b>search</b> engine.</p>');
            });

            it('can handle image item', function () {
                const result = JSONToHTML.itemsToHtml([{title: '', issue_id: 123456, item_type: 'image', url: '', description: 'Hello', order: 0, image: 'https://s3.amazonaws.com/revue/items/images/012/345/678/web/google.png?1234556', original_image_url: 'https://s3.amazonaws.com/revue/items/images/012/345/678/original/google.png?1234556'}]);

                assert.deepEqual(result, '<figure class="kg-card kg-image-card kg-card-hascaption"><img src="https://s3.amazonaws.com/revue/items/images/012/345/678/web/google.png?1234556" class="kg-image" alt loading="lazy"><figcaption>Hello</figcaption></figure>');
            });

            it('can handle tweet item', function () {
                const result = JSONToHTML.itemsToHtml([{title: 'Ghost',issue_id: 123456,item_type: 'tweet',url: 'https://twitter.com/Ghost/status/123456',description: 'Hello world',order: 0,tweet_profile_image: 'https://s3.amazonaws.com/revue/tweet_items/profile_images/000/123/456/thumb/ABCD_normal.png?12345',tweet_handle: 'Ghost',tweet_description: '\u003cspan\u003eHello world\u003c/span\u003e',tweet_lang: 'en'}]);

                assert.deepEqual(result, '<figure class="kg-card kg-embed-card">\n' +
                '                <blockquote class="twitter-tweet"><a href="https://twitter.com/Ghost/status/123456"></a></blockquote>\n' +
                '                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>\n' +
                '                </figure>');
            });

            it('can handle long youtube video item', function () {
                const result = JSONToHTML.itemsToHtml([{title: '', issue_id: 123456, item_type: 'video', url: 'https://www.youtube.com/watch?v=ABCDEF', description: 'Hello World', order: 0, image: 'https://s3.amazonaws.com/revue/items/images/012/345/678/web/maxresdefault.jpg?1667924432'}]);

                assert.deepEqual(result, '<figure class="kg-card kg-embed-card kg-card-hascaption"><iframe width="200" height="113" src="https://www.youtube.com/embed/ABCDEF?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><figcaption>Hello World</figcaption></figure>');
            });

            it('can handle short youtube video item', function () {
                const result = JSONToHTML.itemsToHtml([{title: '', issue_id: 123456, item_type: 'video', url: 'https://youtu.be/ABCDEF', description: 'Hello World', order: 2, image: 'https://s3.amazonaws.com/revue/items/images/006/606/464/web/maxresdefault.jpg?1601883862'}]);

                assert.deepEqual(result, '<figure class="kg-card kg-embed-card kg-card-hascaption"><iframe width="200" height="113" src="https://www.youtube.com/embed/ABCDEF?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><figcaption>Hello World</figcaption></figure>');
            });

            it('can handle vimeo video item', function () {
                const result = JSONToHTML.itemsToHtml([{title: '', issue_id: 123456, item_type: 'video', url: 'https://vimeo.com/789123', description: 'Hello world', order: 2, image: 'https://s3.amazonaws.com/revue/items/images/006/606/464/web/maxresdefault.jpg?1601883862'}]);

                assert.deepEqual(result, '<figure class="kg-card kg-embed-card kg-card-hascaption"><iframe src="https://player.vimeo.com/video/789123" width="200" height="113" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe><figcaption>Hello world</figcaption></figure>');
            });
        });

        describe('cleanCsvHTML', function () {
            it('can wrap blockquote content in p tags', function () {
                const result = JSONToHTML.cleanCsvHTML('<p>Hello World!</p><blockquote>Try <a href="https://example.com">This</a>!</blockquote>');

                assert.deepEqual(result, '<p>Hello World!</p><blockquote><p>Try <a href="https://example.com">This</a>!</p></blockquote>');
            });

            it('can remove unwanted blank paragraphs', function () {
                const result = JSONToHTML.cleanCsvHTML('<p>Hello World!</p><p><br></p><p>Goodbye World!</p>');

                assert.deepEqual(result, '<p>Hello World!</p><p>Goodbye World!</p>');
            });
        });
    });
});
