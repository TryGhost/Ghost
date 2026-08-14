import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot, LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import Prettier from '@prettier/sync';

import {EmbedNode, $createEmbedNode, $isEmbedNode} from '../../src/index.js';

const editorNodes = [EmbedNode];

const youtubeEmbed = {
    html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"></iframe>',
    metadata: {
        author_name: 'Bad Obsession Motorsport',
        author_url: 'https://www.youtube.com/@BadObsessionMotorsport',
        height: 113,
        provider_name: 'YouTube',
        provider_url: 'https://www.youtube.com/',
        thumbnail_height: 360,
        thumbnail_url: 'https://i.ytimg.com/vi/7hCPODjJO7s/hqdefault.jpg',
        thumbnail_width: '480',
        title: 'Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini',
        version: '1.0',
        width: 200
    },
    embedType: 'video',
    url: 'https://www.youtube.com/watch?v=7hCPODjJO7s'
};

describe('EmbedNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
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
            embedType: 'video',
            html: '<p>test</p>',
            metadata: {},
            caption: 'caption text'
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isEmbedNode', editorTest(function () {
        const embedNode = $createEmbedNode(dataset);
        expect($isEmbedNode(embedNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);

            expect(embedNode.url).toBe(dataset.url);
            expect(embedNode.embedType).toBe(dataset.embedType);
            expect(embedNode.html).toBe(dataset.html);
            expect(embedNode.metadata).toBe(dataset.metadata);
            expect(embedNode.caption).toBe(dataset.caption);
        }));

        it('has setters for all properties', editorTest(function () {
            const embedNode = $createEmbedNode({} as Record<string, unknown>);

            expect(embedNode.url).toBe('');
            embedNode.url = 'https://www.ghost.org/';
            expect(embedNode.url).toBe('https://www.ghost.org/');

            expect(embedNode.embedType).toBe('');
            embedNode.embedType = 'https://www.ghost.org/favicon.ico';
            expect(embedNode.embedType).toBe('https://www.ghost.org/favicon.ico');

            expect(embedNode.html).toBe('');
            embedNode.html = 'Ghost: The Creator Economy Platform';
            expect(embedNode.html).toBe('Ghost: The Creator Economy Platform');

            expect(embedNode.metadata).toEqual({});
            embedNode.metadata = {test: 'value'};
            expect(embedNode.metadata).toEqual({test: 'value'});

            expect(embedNode.caption).toBe('');
            embedNode.caption = 'caption here';
            expect(embedNode.caption).toBe('caption here');
        }));

        it('uses a fresh metadata object for each node when metadata is omitted', editorTest(function () {
            const firstNode = $createEmbedNode();
            const secondNode = $createEmbedNode();

            (firstNode.metadata as Record<string, unknown>).test = 'value';
            expect(firstNode.metadata).toEqual({test: 'value'});
            expect(secondNode.metadata).toEqual({});
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const embedNodeDataset = embedNode.getDataset();

            expect(embedNodeDataset).toEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(EmbedNode.getType()).toBe('embed');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const embedNodeDataset = embedNode.getDataset();
            const clone = EmbedNode.clone(embedNode) as EmbedNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...embedNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(EmbedNode.urlTransformMap).toEqual({
                url: 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            expect(embedNode.hasEditMode()).toBe(true);
        }));
    });

    describe('isEmpty', function () {
        it('returns true if url and html are empty', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);

            expect(embedNode.isEmpty()).toBe(false);
            embedNode.url = '';
            expect(embedNode.isEmpty()).toBe(false);
            embedNode.url = '';
            embedNode.html = '';
            expect(embedNode.isEmpty()).toBe(true);
        }));
    });

    describe('exportDOM', function () {
        it('renders embed html with no metadata', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const {element} = embedNode.exportDOM(editor, exportOptions);

            const expectedHtml = `
                <figure class="kg-card kg-embed-card kg-card-hascaption">
                    ${dataset.html}
                    <figcaption>caption text</figcaption>
                </figure>
            `;

            const prettyExpectedHtml = Prettier.format(expectedHtml, {parser: 'html'});

            assertPrettifiesTo((element as HTMLElement).outerHTML, prettyExpectedHtml);
        }));

        it('renders video in email', editorTest(function () {
            const options = {
                target: 'email'
            };
            const embedNode = $createEmbedNode(youtubeEmbed);
            const {element} = embedNode.exportDOM(editor, {...exportOptions, ...options});

            expect((element as HTMLElement).outerHTML).toContain('<!--[if !mso !vml]-->');
            expect((element as HTMLElement).outerHTML).toContain('<a class="kg-video-preview"');
            expect((element as HTMLElement).outerHTML).toContain('<!--[if vml]>');
            expect((element as HTMLElement).outerHTML).toContain('<v:group xmlns');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const json = embedNode.exportJSON();

            expect(json).toEqual({
                type: 'embed',
                version: 1,
                url: dataset.url,
                embedType: dataset.embedType,
                html: dataset.html,
                metadata: dataset.metadata,
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
                            type: 'embed',
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
                        const [embedNode] = $getRoot().getChildren() as EmbedNode[];

                        expect(embedNode.url).toBe(dataset.url);
                        expect(embedNode.embedType).toBe(dataset.embedType);
                        expect(embedNode.html).toBe(dataset.html);
                        expect(embedNode.metadata).toEqual(dataset.metadata);
                        expect(embedNode.caption).toBe(dataset.caption);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('importDOM', function () {
        describe('figure iframe', function () {
        // YouTube (same structure used for vimeo, instagram, etc)
        // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["embed",{"url":"https://www.youtube.com/watch?v=YTVID","html":"<iframe width=\"480\" height=\"270\" src=\"https://www.youtube.com/embed/YTVID?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe>","type":"video"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}
        // Ghost HTML <!--kg-card-begin: embed--><figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure><!--kg-card-end: embed-->
        // Medium Export HTML <figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>
        // Medium Live HTML <figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>
        // WP <figure class=\"wp-block-embed-youtube \"><div class=\"wp-block-embed__wrapper\">\n<span class=\"embed-youtube\" style=\"text-align:center; display: block;\"><iframe class='youtube-player' type='text/html' width='640' height='360' src='https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent' allowfullscreen='true' style='border: 0;'></iframe></span>\n</div></figure>

            it('youtube iframe', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].getType()).toBe('embed');
                // expect(nodes[0].embedType).toBe('embed');
                expect(nodes[0].url).toBe('https://www.youtube.com/embed/YTVID?feature=oembed');
                assertPrettifiesTo(nodes[0].html, '<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
            }));

            it('medium youtube iframe', editorTest(function () {
                const document = createDocument(html`<figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].getType()).toBe('embed');
                // expect(nodes[0].embedType).toBe('embed');
                expect(nodes[0].url).toBe('https://www.youtube.com/embed/YTVID?feature=oembed');
                expect(nodes[0].html).toBe('<iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe>');
            }));

            it('wordpress youtube iframe', editorTest(function () {
                const document = createDocument(html`<figure class="wp-block-embed-youtube "><div class="wp-block-embed__wrapper"><span class="embed-youtube" style="text-align:center; display: block;"><iframe class=\'youtube-player\' type=\'text/html\' width=\'640\' height=\'360\' src=\'https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent\' allowfullscreen=\'true\' style=\'border:0;\'></iframe></span>\n</div></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].getType()).toBe('embed');
                // expect(nodes[0].embedType).toBe('embed');
                expect(nodes[0].url).toBe('https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent');
                expect(nodes[0].html).toBe('<iframe class="youtube-player" type="text/html" width="640" height="360" src="https://www.youtube.com/embed/YTVID?version=3&amp;rel=1&amp;fs=1&amp;autohide=2&amp;showsearch=0&amp;showinfo=1&amp;iv_load_policy=1&amp;wmode=transparent" allowfullscreen="true" style="border: 0"></iframe>');
            }));

            it('youtube iframe with caption', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><figcaption>My Video</figcaption></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].getType()).toBe('embed');
                // expect(nodes[0].embedType).toBe('embed');
                expect(nodes[0].url).toBe('https://www.youtube.com/embed/YTVID?feature=oembed');
                assertPrettifiesTo(nodes[0].html, '<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
                expect(nodes[0].caption).toBe('My Video');
            }));

            it('ignore iframe with relative src', editorTest(function () {
                const document = createDocument(html`<figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(0);
            }));
        });
        describe('iframe', function () {
            // These are iFrames without a <figure> but may have a <div> or <p> or nothing
            // WP Naked YouTube <div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>
            // Hubspot Naked YouTube <div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>

            it('youtube iframe with single wrapper div', editorTest(function () {
                const document = createDocument(html`<div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].url).toBe('https://www.youtube.com/embed/YTVID?feature=oembed');
                assertPrettifiesTo(nodes[0].html, '<iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
            }));

            it('youtube iframe with double wrapper div + schemaless url', editorTest(function () {
                const document = createDocument(html`<div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].url).toBe('https://www.youtube.com/embed/YTVID');
                assertPrettifiesTo(nodes[0].html, '<iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="https://www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe>');
            }));
        });

        describe('figure blockquote', function () {
            // Twitter
            // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["embed",{"url":"https://twitter.com/iamdevloper/status/1133348012439220226","html":"<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href=\"https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw\">May 28, 2019</a></blockquote>\n<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>\n","type":"rich"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}
            // Ghost HTML <!--kg-card-begin: embed--><figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure><!--kg-card-end: embed-->
            // Medium Export HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>
            // Medium Live HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><iframe data-width="500" data-height="281" width="500" height="281" data-src="/media/6969?postId=890" data-media-id="6969" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1071055431215276033%2FU9-RIlDs_400x400.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/6969?postId=890"></iframe></figure>

            it('twitter blockquote', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].url).toBe('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                assertPrettifiesTo(nodes[0].html, '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }));

            it('twitter medium blockquote', editorTest(function () {
                const document = createDocument(html`<figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].url).toBe('https://twitter.com/iamdevloper/status/1133348012439220226');
                assertPrettifiesTo(nodes[0].html, '<blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }));

            it('twitter blockquote with caption', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption>A Tweet</figcaption></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].url).toBe('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                assertPrettifiesTo(nodes[0].html, '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
                expect(nodes[0].caption).toBe('A Tweet');
            }));

            it('twitter blockquote with linked caption', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption><a href="https://twitter.com">A Tweet</a></figcaption></figure>`);
                const nodes = $generateNodesFromDOM(editor, document) as EmbedNode[];

                expect(nodes.length).toBe(1);
                expect(nodes[0].url).toBe('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                assertPrettifiesTo(nodes[0].html, '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
                expect(nodes[0].caption).toBe('<a href="https://twitter.com">A Tweet</a>');
            }));
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createEmbedNode({} as Record<string, unknown>);
            expect(node.getTextContent()).toBe('');

            node.caption = 'Test caption';

            expect(node.getTextContent()).toBe('Test caption\n\n');
        }));
    });
});
