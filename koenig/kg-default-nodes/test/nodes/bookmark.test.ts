import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
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
    const editorTest = (testFn: () => void) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

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
        expect($isBookmarkNode(bookmarkNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);

            const metadata = dataset.metadata as Record<string, unknown>;
            expect(bookmarkNode.url).toBe(dataset.url);
            expect(bookmarkNode.icon).toBe(metadata.icon);
            expect(bookmarkNode.title).toBe(metadata.title);
            expect(bookmarkNode.description).toBe(metadata.description);
            expect(bookmarkNode.author).toBe(metadata.author);
            expect(bookmarkNode.publisher).toBe(metadata.publisher);
            expect(bookmarkNode.thumbnail).toBe(metadata.thumbnail);
            expect(bookmarkNode.caption).toBe(dataset.caption);
        }));

        it('has setters for all properties', editorTest(function () {
            const bookmarkNode = $createBookmarkNode();

            expect(bookmarkNode.url).toBe('');
            bookmarkNode.url = 'https://www.ghost.org/';
            expect(bookmarkNode.url).toBe('https://www.ghost.org/');

            expect(bookmarkNode.icon).toBe('');
            bookmarkNode.icon = 'https://www.ghost.org/favicon.ico';
            expect(bookmarkNode.icon).toBe('https://www.ghost.org/favicon.ico');

            expect(bookmarkNode.title).toBe('');
            bookmarkNode.title = 'Ghost: The Creator Economy Platform';
            expect(bookmarkNode.title).toBe('Ghost: The Creator Economy Platform');

            expect(bookmarkNode.description).toBe('');
            bookmarkNode.description = 'doing kewl stuff';
            expect(bookmarkNode.description).toBe('doing kewl stuff');

            expect(bookmarkNode.author).toBe('');
            bookmarkNode.author = 'ghost';
            expect(bookmarkNode.author).toBe('ghost');

            expect(bookmarkNode.publisher).toBe('');
            bookmarkNode.publisher = 'Ghost - The Professional Publishing Platform';
            expect(bookmarkNode.publisher).toBe('Ghost - The Professional Publishing Platform');

            expect(bookmarkNode.thumbnail).toBe('');
            bookmarkNode.thumbnail = 'https://ghost.org/images/meta/ghost.png';
            expect(bookmarkNode.thumbnail).toBe('https://ghost.org/images/meta/ghost.png');

            expect(bookmarkNode.caption).toBe('');
            bookmarkNode.caption = 'caption here';
            expect(bookmarkNode.caption).toBe('caption here');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            const bookmarkNodeDataset = bookmarkNode.getDataset();

            expect(bookmarkNodeDataset).toEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(BookmarkNode.getType()).toBe('bookmark');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            const bookmarkNodeDataset = bookmarkNode.getDataset();
            const clone = BookmarkNode.clone(bookmarkNode) as BookmarkNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...bookmarkNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(BookmarkNode.urlTransformMap).toEqual({
                url: 'url',
                'metadata.icon': 'url',
                'metadata.thumbnail': 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            expect(bookmarkNode.hasEditMode()).toBe(true);
        }));
    });

    describe('isEmpty', function () {
        it('returns true if url is empty', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);

            expect(bookmarkNode.isEmpty()).toBe(false);
            bookmarkNode.url = '';
            expect(bookmarkNode.isEmpty()).toBe(true);
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

            assertPrettifiesTo(element.outerHTML, prettyExpectedHtml);
        }));

        it('renders email target', editorTest(function () {
            const options = {
                target: 'email'
            };
            const bookmarkNode = $createBookmarkNode(dataset);
            const result = bookmarkNode.exportDOM(editor, {...exportOptions, ...options});
            const element = result.element as HTMLElement;

            expect(element.innerHTML).toContain('<!--[if !mso !vml]-->');
            expect(element.innerHTML).toContain('<figure class="kg-card kg-bookmark-card');
            expect(element.innerHTML).toContain('<!--[if vml]>');
            expect(element.innerHTML).toContain('<table class="kg-card kg-bookmark-card--outlook"');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const bookmarkNode = $createBookmarkNode(dataset);
            const json = bookmarkNode.exportJSON();
            const metadata = dataset.metadata as Record<string, unknown>;

            expect(json).toEqual({
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
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
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

                        expect(bookmarkNode.url).toBe(dataset.url);
                        expect(bookmarkNode.icon).toBe((dataset.metadata as Record<string, unknown>).icon);
                        expect(bookmarkNode.title).toBe((dataset.metadata as Record<string, unknown>).title);
                        expect(bookmarkNode.description).toBe((dataset.metadata as Record<string, unknown>).description);
                        expect(bookmarkNode.author).toBe((dataset.metadata as Record<string, unknown>).author);
                        expect(bookmarkNode.publisher).toBe((dataset.metadata as Record<string, unknown>).publisher);
                        expect(bookmarkNode.thumbnail).toBe((dataset.metadata as Record<string, unknown>).thumbnail);
                        expect(bookmarkNode.caption).toBe(dataset.caption);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            expect(BookmarkNode.getType()).toBe('bookmark');
        }));

        it('urlTransformMap', editorTest(function () {
            expect(BookmarkNode.urlTransformMap).toEqual({
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

            expect(nodes.length).toBe(1);
            const node = nodes[0] as BookmarkNode;
            expect(node.url).toBe(dataset.url);
            expect(node.icon).toBe((dataset.metadata as Record<string, unknown>).icon);
            expect(node.title).toBe((dataset.metadata as Record<string, unknown>).title);
            expect(node.description).toBe((dataset.metadata as Record<string, unknown>).description);
            expect(node.author).toBe((dataset.metadata as Record<string, unknown>).author);
            expect(node.publisher).toBe((dataset.metadata as Record<string, unknown>).publisher);
            expect(node.thumbnail).toBe((dataset.metadata as Record<string, unknown>).thumbnail);
            expect(node.caption).toBe(dataset.caption);
        }));

        // mixtape embeds parse into bookmark cards
        describe('mixtapes', function () {
        // Mobiledoc {\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"bookmark\",{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"metadata\":{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"title\":\"TypeScript at Slack\",\"description\":\"When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…\",\"author\":\"Felix Rieseberg\",\"publisher\":\"Several People Are Coding\",\"thumbnail\":\"https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png\",\"icon\":\"https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png\"},\"type\":\"bookmark\"}]],\"markups\":[],\"sections\":[[10,0],[1,\"p\",[]]]}
        // Ghost HTML <figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://slack.engineering/typescript-at-slack-a81307fa288d"><div class="kg-bookmark-content"><div class="kg-bookmark-title">TypeScript at Slack</div><div class="kg-bookmark-description">When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png"><span class="kg-bookmark-author">Felix Rieseberg</span><span class="kg-bookmark-publisher">Several People Are Coding</span></div></div><div class="kg-bookmark-thumbnail"><img src="https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png"></div></a></figure>
        // Medium Export HTML <div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>

            it('parses mixtape block with all data', editorTest(function () {
                const document = createDocument(html`<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(1);
                const bookmarkNode = nodes[0] as BookmarkNode;

                expect(bookmarkNode.url).toBe('https://slack.engineering/typescript-at-slack-a81307fa288d');
                expect(bookmarkNode.title).toBe('TypeScript at Slack');
                expect(bookmarkNode.description).toBe('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
                expect(bookmarkNode.publisher).toBe('slack.engineering');
                expect(bookmarkNode.thumbnail).toBe('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
            }));

            it('parses mixtape with missing title', editorTest(function () {
                const document = createDocument(html`<div class="graf graf--mixtapeEmbed graf-after--mixtapeEmbed"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(1);
                const bookmarkNode = nodes[0] as BookmarkNode;

                expect(bookmarkNode.url).toBe('https://slack.engineering/typescript-at-slack-a81307fa288d');
                expect(bookmarkNode.title).toBe('');
                expect(bookmarkNode.description).toBe('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
                expect(bookmarkNode.publisher).toBe('slack.engineering');
                expect(bookmarkNode.thumbnail).toBe('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
            }));

            it('parses mixtape when title and description are nested descendants', editorTest(function () {
                const document = createDocument(html`<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><span><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong></span><br><span><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em></span>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(1);
                const bookmarkNode = nodes[0] as BookmarkNode;

                expect(bookmarkNode.url).toBe('https://slack.engineering/typescript-at-slack-a81307fa288d');
                expect(bookmarkNode.title).toBe('TypeScript at Slack');
                expect(bookmarkNode.description).toBe('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
                expect(bookmarkNode.publisher).toContain('slack.engineering');
                expect(bookmarkNode.thumbnail).toBe('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
            }));
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createBookmarkNode();
            expect(node.getTextContent()).toBe('');

            node.title = 'Test';
            node.description = 'Test description';
            node.url = 'https://example.com';
            node.caption = 'Test <strong>caption</strong>';

            expect(node.getTextContent()).toBe('Test\nTest description\nhttps://example.com\nTest <strong>caption</strong>\n\n');
        }));
    });
});
