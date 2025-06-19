const {createDocument, html} = require('../test-utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');

const {EmbedNode, $createEmbedNode, $isEmbedNode} = require('../../');

const editorNodes = [EmbedNode];

describe('EmbedNode', function () {
    let editor;
    let dataset;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = testFn => function (done) {
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
            embedType: 'video',
            html: '<p>test</p>',
            metadata: {},
            caption: 'caption text'
        };
    });

    it('matches node with $isEmbedNode', editorTest(function () {
        const embedNode = $createEmbedNode(dataset);
        $isEmbedNode(embedNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);

            embedNode.url.should.equal(dataset.url);
            embedNode.embedType.should.equal(dataset.embedType);
            embedNode.html.should.equal(dataset.html);
            embedNode.metadata.should.equal(dataset.metadata);
            embedNode.caption.should.equal(dataset.caption);
        }));

        it('has setters for all properties', editorTest(function () {
            const embedNode = $createEmbedNode();

            embedNode.url.should.equal('');
            embedNode.url = 'https://www.ghost.org/';
            embedNode.url.should.equal('https://www.ghost.org/');

            embedNode.embedType.should.equal('');
            embedNode.embedType = 'https://www.ghost.org/favicon.ico';
            embedNode.embedType.should.equal('https://www.ghost.org/favicon.ico');

            embedNode.html.should.equal('');
            embedNode.html = 'Ghost: The Creator Economy Platform';
            embedNode.html.should.equal('Ghost: The Creator Economy Platform');

            embedNode.metadata.should.deepEqual({});
            embedNode.metadata = {test: 'value'};
            embedNode.metadata.should.deepEqual({test: 'value'});

            embedNode.caption.should.equal('');
            embedNode.caption = 'caption here';
            embedNode.caption.should.equal('caption here');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const embedNodeDataset = embedNode.getDataset();

            embedNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            EmbedNode.getType().should.equal('embed');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const embedNodeDataset = embedNode.getDataset();
            const clone = EmbedNode.clone(embedNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...embedNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            EmbedNode.urlTransformMap.should.deepEqual({
                url: 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            embedNode.hasEditMode().should.be.true();
        }));
    });

    describe('isEmpty', function () {
        it('returns true if url and html are empty', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);

            embedNode.isEmpty().should.be.false();
            embedNode.url = '';
            embedNode.isEmpty().should.be.false();
            embedNode.url = '';
            embedNode.html = '';
            embedNode.isEmpty().should.be.true();
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const json = embedNode.exportJSON();

            json.should.deepEqual({
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
        it('imports all data', function (done) {
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
                    const [embedNode] = $getRoot().getChildren();

                    embedNode.url.should.equal(dataset.url);
                    embedNode.embedType.should.equal(dataset.embedType);
                    embedNode.html.should.equal(dataset.html);
                    embedNode.metadata.should.deepEqual(dataset.metadata);
                    embedNode.caption.should.equal(dataset.caption);

                    done();
                } catch (e) {
                    done(e);
                }
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
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].embedType.should.equal('embed');
                nodes[0].url.should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].html.should.equal('<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
            }));

            it('medium youtube iframe', editorTest(function () {
                const document = createDocument(html`<figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].embedType.should.equal('embed');
                nodes[0].url.should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].html.should.equal('<iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe>');
            }));

            it('wordpress youtube iframe', editorTest(function () {
                const document = createDocument(html`<figure class="wp-block-embed-youtube "><div class="wp-block-embed__wrapper"><span class="embed-youtube" style="text-align:center; display: block;"><iframe class=\'youtube-player\' type=\'text/html\' width=\'640\' height=\'360\' src=\'https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent\' allowfullscreen=\'true\' style=\'border:0;\'></iframe></span>\n</div></figure>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].embedType.should.equal('embed');
                nodes[0].url.should.equal('https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent');
                nodes[0].html.should.equal('<iframe class="youtube-player" type="text/html" width="640" height="360" src="https://www.youtube.com/embed/YTVID?version=3&amp;rel=1&amp;fs=1&amp;autohide=2&amp;showsearch=0&amp;showinfo=1&amp;iv_load_policy=1&amp;wmode=transparent" allowfullscreen="true" style="border: 0"></iframe>');
            }));

            it('youtube iframe with caption', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><figcaption>My Video</figcaption></figure>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].embedType.should.equal('embed');
                nodes[0].url.should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].html.should.equal('<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
                nodes[0].caption.should.equal('My Video');
            }));

            it('ignore iframe with relative src', editorTest(function () {
                const document = createDocument(html`<figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(0);
            }));
        });
        describe('iframe', function () {
            // These are iFrames without a <figure> but may have a <div> or <p> or nothing
            // WP Naked YouTube <div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>
            // Hubspot Naked YouTube <div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>

            it('youtube iframe with single wrapper div', editorTest(function () {
                const document = createDocument(html`<div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].url.should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].html.should.equal('<iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
            }));

            it('youtube iframe with double wrapper div + schemaless url', editorTest(function () {
                const document = createDocument(html`<div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].url.should.equal('https://www.youtube.com/embed/YTVID');
                nodes[0].html.should.prettifyTo('<iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="https://www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe>');
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
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].url.should.equal('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                nodes[0].html.should.prettifyTo('<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }));

            it('twitter medium blockquote', editorTest(function () {
                const document = createDocument(html`<figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].url.should.equal('https://twitter.com/iamdevloper/status/1133348012439220226');
                nodes[0].html.should.prettifyTo('<blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }));

            it('twitter blockquote with caption', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption>A Tweet</figcaption></figure>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].url.should.equal('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                nodes[0].html.should.prettifyTo('<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
                nodes[0].caption.should.equal('A Tweet');
            }));

            it('twitter blockquote with linked caption', editorTest(function () {
                const document = createDocument(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption><a href="https://twitter.com">A Tweet</a></figcaption></figure>`);
                const nodes = $generateNodesFromDOM(editor, document);

                nodes.length.should.equal(1);
                nodes[0].url.should.equal('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                nodes[0].html.should.prettifyTo('<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
                nodes[0].caption.should.equal('<a href="https://twitter.com">A Tweet</a>');
            }));
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createEmbedNode();
            node.getTextContent().should.equal('');

            node.caption = 'Test caption';

            node.getTextContent().should.equal('Test caption\n\n');
        }));
    });
});
