import 'should';
import {createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot} from 'lexical';
import type {LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import Prettier from '@prettier/sync';

import {BookmarkNode, $createBookmarkNode, $isBookmarkNode, type BookmarkData} from '../../src/index.js';

const editorNodes = [BookmarkNode];

describe('BookmarkNode', function () {
    let editor: LexicalEditor;
    let dataset: BookmarkData;
    let exportOptions: Record<string, unknown>;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => function (done: (err?: unknown) => void) {
        editor.update(() => {
            try {
                testFn();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            url: 'https://www.ghost.org/',
            metadata: {
                icon: 'https://www.ghost.org/favicon.ico',
                title: 'Ghost: The Creator Economy Platform',
                description: 'doing kewl stuff',
                author: 'ghost',
                publisher: 'Ghost - The Professional Publishing Platform',
                thumbnail: 'https://ghost.org/images/meta/ghost.png'
            },
            caption: 'caption here'
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isBookmarkNode', editorTest(function () {
        const bookmarkNode = $createBookmarkNode(dataset);
        $isBookmarkNode(bookmarkNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);

            const metadata = dataset.metadata as Record<string, unknown>;
            bookmarkNode.url.should.equal(dataset.url);
            bookmarkNode.icon.should.equal(metadata.icon);
            bookmarkNode.title.should.equal(metadata.title);
            bookmarkNode.description.should.equal(metadata.description);
            bookmarkNode.author.should.equal(metadata.author);
            bookmarkNode.publisher.should.equal(metadata.publisher);
            bookmarkNode.thumbnail.should.equal(metadata.thumbnail);
            bookmarkNode.caption.should.equal(dataset.caption);
        }));

        it('has setters for all properties', editorTest(function () {
            const bookmarkNode = $createBookmarkNode();

            bookmarkNode.url.should.equal('');
            bookmarkNode.url = 'https://www.ghost.org/';
            bookmarkNode.url.should.equal('https://www.ghost.org/');

            bookmarkNode.icon.should.equal('');
            bookmarkNode.icon = 'https://www.ghost.org/favicon.ico';
            bookmarkNode.icon.should.equal('https://www.ghost.org/favicon.ico');

            bookmarkNode.title.should.equal('');
            bookmarkNode.title = 'Ghost: The Creator Economy Platform';
            bookmarkNode.title.should.equal('Ghost: The Creator Economy Platform');

            bookmarkNode.description.should.equal('');
            bookmarkNode.description = 'doing kewl stuff';
            bookmarkNode.description.should.equal('doing kewl stuff');

            bookmarkNode.author.should.equal('');
            bookmarkNode.author = 'ghost';
            bookmarkNode.author.should.equal('ghost');

            bookmarkNode.publisher.should.equal('');
            bookmarkNode.publisher = 'Ghost - The Professional Publishing Platform';
            bookmarkNode.publisher.should.equal('Ghost - The Professional Publishing Platform');

            bookmarkNode.thumbnail.should.equal('');
            bookmarkNode.thumbnail = 'https://ghost.org/images/meta/ghost.png';
            bookmarkNode.thumbnail.should.equal('https://ghost.org/images/meta/ghost.png');

            bookmarkNode.caption.should.equal('');
            bookmarkNode.caption = 'caption here';
            bookmarkNode.caption.should.equal('caption here');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            const bookmarkNodeDataset = bookmarkNode.getDataset();

            bookmarkNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            BookmarkNode.getType().should.equal('bookmark');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            const bookmarkNodeDataset = bookmarkNode.getDataset();
            const clone = BookmarkNode.clone(bookmarkNode) as BookmarkNode;
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...bookmarkNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            BookmarkNode.urlTransformMap.should.deepEqual({
                url: 'url',
                'metadata.icon': 'url',
                'metadata.thumbnail': 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            bookmarkNode.hasEditMode().should.be.true();
        }));
    });

    describe('isEmpty', function () {
        it('returns true if url is empty', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);

            bookmarkNode.isEmpty().should.be.false();
            bookmarkNode.url = '';
            bookmarkNode.isEmpty().should.be.true();
        }));
    });

    describe('exportDOM', function () {
        it('creates an bookmark card', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            const result = bookmarkNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;
            const metadata = dataset.metadata as Record<string, unknown>;

            const expectedHtml = `
                <figure class="kg-card kg-bookmark-card kg-card-hascaption">
                    <a class="kg-bookmark-container" href="${dataset.url}">
                        <div class="kg-bookmark-content">
                            <div class="kg-bookmark-title">${metadata.title}</div>
                            <div class="kg-bookmark-description">${metadata.description}</div>
                            <div class="kg-bookmark-metadata">
                                <img class="kg-bookmark-icon" src="${metadata.icon}" alt="">
                                <span class="kg-bookmark-author">${metadata.publisher}</span>
                                <span class="kg-bookmark-publisher">${metadata.author}</span>
                            </div>
                        </div>
                        <div class="kg-bookmark-thumbnail">
                            <img src="${metadata.thumbnail}" alt="" onerror="this.style.display = 'none'">
                        </div>
                    </a>
                    <figcaption>${dataset.caption}</figcaption>
                </figure>
            `;

            const prettyExpectedHtml = Prettier.format(expectedHtml, {parser: 'html'});

            element.outerHTML.should.prettifyTo(prettyExpectedHtml);
        }));

        it('renders email target', editorTest(function () {
            const options = {
                target: 'email'
            };
            const bookmarkNode = $createBookmarkNode(dataset);
            const result = bookmarkNode.exportDOM(editor, {...exportOptions, ...options});
            const element = result.element as HTMLElement;

            element.innerHTML.should.containEql('<!--[if !mso !vml]-->');
            element.innerHTML.should.containEql('<figure class="kg-card kg-bookmark-card');
            element.innerHTML.should.containEql('<!--[if vml]>');
            element.innerHTML.should.containEql('<table class="kg-card kg-bookmark-card--outlook"');
        }));

        it('renders an empty span with a missing src', editorTest(function () {
            const bookmarkNode = $createBookmarkNode();
            const result = bookmarkNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;

            element.outerHTML.should.equal('<span></span>');
        }));

        it('escapes HTML for text fields in web', editorTest(function () {
            dataset = {
                url: 'https://www.fake.org/',
                metadata: {
                    icon: 'https://www.fake.org/favicon.ico',
                    title: 'Ghost: Independent technology <script>alert("XSS")</script> for modern publishing.',
                    description: 'doing "kewl" stuff',
                    author: 'fa\'ker',
                    publisher: 'Fake <script>alert("XSS")</script>',
                    thumbnail: 'https://fake.org/image.png'
                },
                caption: '<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>'
            };
            const bookmarkNode = $createBookmarkNode(dataset);
            const result = bookmarkNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;

            // Check that text fields are escaped
            element.innerHTML.should.containEql('Ghost: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.');
            element.innerHTML.should.containEql('doing "kewl" stuff');
            element.innerHTML.should.containEql('fa\'ker');
            element.innerHTML.should.containEql('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;');

            // Check that caption is not escaped
            element.innerHTML.should.containEql('<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>');
        }));

        it('escapes HTML for text fields in email', editorTest(function () {
            const options = {
                target: 'email'
            };
            dataset = {
                url: 'https://www.fake.org/',
                metadata: {
                    icon: 'https://www.fake.org/favicon.ico',
                    title: 'Ghost: Independent technology <script>alert("XSS")</script> for modern publishing.',
                    description: 'doing "kewl" stuff',
                    author: 'fa\'ker',
                    publisher: 'Fake <script>alert("XSS")</script>',
                    thumbnail: 'https://fake.org/image.png'
                },
                caption: '<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>'
            };
            const bookmarkNode = $createBookmarkNode(dataset);
            const result = bookmarkNode.exportDOM(editor, {...exportOptions, ...options});
            const element = result.element as HTMLElement;

            // Check that email template is used
            element.innerHTML.should.containEql('<!--[if !mso !vml]-->');

            // Check that text fields are escaped
            element.innerHTML.should.containEql('Ghost: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.');
            element.innerHTML.should.containEql('doing &amp;quot;kewl&amp;quot; stuff');
            element.innerHTML.should.containEql('fa\'ker');
            element.innerHTML.should.containEql('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;');

            // Check that caption is not escaped
            element.innerHTML.should.containEql('<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            const json = bookmarkNode.exportJSON();
            const metadata = dataset.metadata as Record<string, unknown>;

            json.should.deepEqual({
                type: 'bookmark',
                version: 1,
                url: dataset.url,
                metadata: {
                    icon: metadata.icon,
                    title: metadata.title,
                    description: metadata.description,
                    author: metadata.author,
                    publisher: metadata.publisher,
                    thumbnail: metadata.thumbnail
                },
                caption: dataset.caption
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'bookmark',
                        ...dataset
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [bookmarkNode] = $getRoot().getChildren() as BookmarkNode[];

                    bookmarkNode.url.should.equal(dataset.url);
                    bookmarkNode.icon.should.equal((dataset.metadata as Record<string, unknown>).icon);
                    bookmarkNode.title.should.equal((dataset.metadata as Record<string, unknown>).title);
                    bookmarkNode.description.should.equal((dataset.metadata as Record<string, unknown>).description);
                    bookmarkNode.author.should.equal((dataset.metadata as Record<string, unknown>).author);
                    bookmarkNode.publisher.should.equal((dataset.metadata as Record<string, unknown>).publisher);
                    bookmarkNode.thumbnail.should.equal((dataset.metadata as Record<string, unknown>).thumbnail);
                    bookmarkNode.caption.should.equal(dataset.caption);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            BookmarkNode.getType().should.equal('bookmark');
        }));

        it('urlTransformMap', editorTest(function () {
            BookmarkNode.urlTransformMap.should.deepEqual({
                url: 'url',
                'metadata.icon': 'url',
                'metadata.thumbnail': 'url'
            });
        }));
    });

    describe('importDOM', function () {
        it('parses bookmark card', editorTest(function () {
            const metadata = dataset.metadata as Record<string, unknown>;
            const document = createDocument(html`
                <figure class="kg-card kg-bookmark-card kg-card-hascaption">
                    <a class="kg-bookmark-container" href="${dataset.url}">
                        <div class="kg-bookmark-content">
                            <div class="kg-bookmark-title">${metadata.title}</div>
                            <div class="kg-bookmark-description">${metadata.description}</div>
                            <div class="kg-bookmark-metadata">
                                <img class="kg-bookmark-icon" src="${metadata.icon}" alt="">
                                <span class="kg-bookmark-author">${metadata.publisher}</span>
                                <span class="kg-bookmark-publisher">${metadata.author}</span>
                            </div>
                        </div>
                        <div class="kg-bookmark-thumbnail">
                            <img src="${metadata.thumbnail}" alt="" onerror="this.style.display = 'none'">
                        </div>
                    </a>
                    <figcaption>${dataset.caption}</figcaption>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            const node = nodes[0] as BookmarkNode;
            node.url.should.equal(dataset.url);
            node.icon.should.equal((dataset.metadata as Record<string, unknown>).icon);
            node.title.should.equal((dataset.metadata as Record<string, unknown>).title);
            node.description.should.equal((dataset.metadata as Record<string, unknown>).description);
            node.author.should.equal((dataset.metadata as Record<string, unknown>).author);
            node.publisher.should.equal((dataset.metadata as Record<string, unknown>).publisher);
            node.thumbnail.should.equal((dataset.metadata as Record<string, unknown>).thumbnail);
            node.caption.should.equal(dataset.caption);
        }));

        // mixtape embeds parse into bookmark cards
        describe('mixtapes', function () {
        // Mobiledoc {\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"bookmark\",{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"metadata\":{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"title\":\"TypeScript at Slack\",\"description\":\"When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…\",\"author\":\"Felix Rieseberg\",\"publisher\":\"Several People Are Coding\",\"thumbnail\":\"https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png\",\"icon\":\"https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png\"},\"type\":\"bookmark\"}]],\"markups\":[],\"sections\":[[10,0],[1,\"p\",[]]]}
        // Ghost HTML <figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://slack.engineering/typescript-at-slack-a81307fa288d"><div class="kg-bookmark-content"><div class="kg-bookmark-title">TypeScript at Slack</div><div class="kg-bookmark-description">When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png"><span class="kg-bookmark-author">Felix Rieseberg</span><span class="kg-bookmark-publisher">Several People Are Coding</span></div></div><div class="kg-bookmark-thumbnail"><img src="https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png"></div></a></figure>
        // Medium Export HTML <div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>

            it('parses mixtape block with all data', editorTest(function () {
                const document = createDocument(html`<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                const bookmarkNode = nodes[0] as BookmarkNode;

                bookmarkNode.url.should.equal('https://slack.engineering/typescript-at-slack-a81307fa288d');
                bookmarkNode.title.should.equal('TypeScript at Slack');
                bookmarkNode.description.should.equal('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
                bookmarkNode.publisher.should.equal('slack.engineering');
                bookmarkNode.thumbnail.should.equal('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
            }));

            it('parses mixtape with missing title', editorTest(function () {
                const document = createDocument(html`<div class="graf graf--mixtapeEmbed graf-after--mixtapeEmbed"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                const bookmarkNode = nodes[0] as BookmarkNode;

                bookmarkNode.url.should.equal('https://slack.engineering/typescript-at-slack-a81307fa288d');
                bookmarkNode.title.should.equal('');
                bookmarkNode.description.should.equal('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
                bookmarkNode.publisher.should.equal('slack.engineering');
                bookmarkNode.thumbnail.should.equal('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
            }));

            it('parses mixtape when title and description are nested descendants', editorTest(function () {
                const document = createDocument(html`<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><span><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong></span><br><span><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em></span>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                const bookmarkNode = nodes[0] as BookmarkNode;

                bookmarkNode.url.should.equal('https://slack.engineering/typescript-at-slack-a81307fa288d');
                bookmarkNode.title.should.equal('TypeScript at Slack');
                bookmarkNode.description.should.equal('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
                bookmarkNode.publisher.should.containEql('slack.engineering');
                bookmarkNode.thumbnail.should.equal('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
            }));
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createBookmarkNode();
            node.getTextContent().should.equal('');

            node.title = 'Test';
            node.description = 'Test description';
            node.url = 'https://example.com';
            node.caption = 'Test <strong>caption</strong>';

            node.getTextContent().should.equal('Test\nTest description\nhttps://example.com\nTest <strong>caption</strong>\n\n');
        }));
    });
});
