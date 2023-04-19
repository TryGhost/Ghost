const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const Prettier = require('prettier');

const {EmbedNode, $createEmbedNode, $isEmbedNode} = require('../../');

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
    let editor;
    let dataset;
    let exportOptions;

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

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document; 
            }
        };
    });

    it('matches node with $isEmbedNode', editorTest(function () {
        const embedNode = $createEmbedNode(dataset);
        $isEmbedNode(embedNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);

            embedNode.getUrl().should.equal(dataset.url);
            embedNode.getEmbedType().should.equal(dataset.embedType);
            embedNode.getHtml().should.equal(dataset.html);
            embedNode.getMetadata().should.equal(dataset.metadata);
            embedNode.getCaption().should.equal(dataset.caption);
        }));

        it('has setters for all properties', editorTest(function () {
            const embedNode = $createEmbedNode();

            embedNode.getUrl().should.equal('');
            embedNode.setUrl('https://www.ghost.org/');
            embedNode.getUrl().should.equal('https://www.ghost.org/');

            embedNode.getEmbedType().should.equal('');
            embedNode.setEmbedType('https://www.ghost.org/favicon.ico');
            embedNode.getEmbedType().should.equal('https://www.ghost.org/favicon.ico');

            embedNode.getHtml().should.equal('');
            embedNode.setHtml('Ghost: The Creator Economy Platform');
            embedNode.getHtml().should.equal('Ghost: The Creator Economy Platform');

            embedNode.getMetadata().should.deepEqual({});
            embedNode.setMetadata({test: 'value'});
            embedNode.getMetadata().should.deepEqual({test: 'value'});

            embedNode.getCaption().should.equal('');
            embedNode.setCaption('caption here');
            embedNode.getCaption().should.equal('caption here');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const embedNodeDataset = embedNode.getDataset();

            embedNodeDataset.should.deepEqual({
                ...dataset
            });
        }));

        it('has isEmpty() convenience method', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);

            embedNode.isEmpty().should.be.false;
            embedNode.setUrl('');
            embedNode.isEmpty().should.be.true;
        }));
    });

    describe('exportDOM', function () {
        it('renders embed html with no metadata', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const {element} = embedNode.exportDOM(exportOptions);

            const expectedHtml = `
                <figure class="kg-card kg-embed-card kg-card-hascaption">
                    ${dataset.html}
                    <figcaption>caption text</figcaption>
                </figure>
            `;

            const prettyExpectedHtml = Prettier.format(expectedHtml, {parser: 'html'});

            element.outerHTML.should.prettifyTo(prettyExpectedHtml);
        })); 

        it('renders a twitter embed without api token', editorTest(function () {
            const embedNode = $createEmbedNode({
                url: 'https://twitter.com/ghost/status/1395670367216619520',
                embedType: 'twitter',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Ghost 4.0 is out now! 🎉</p>&mdash; Ghost (@ghost) <a href="https://twitter.com/ghost/status/1395670367216619520?ref_src=twsrc%5Etfw">May 21, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
                metadata: {
                    height: 500,
                    provider_name: 'Twitter',
                    provider_url: 'https://twitter.com',
                    thumbnail_height: 150,
                    thumbnail_url: 'https://pbs.twimg.com/media/E1Y1q3bXMAU7m4n?format=jpg&name=small',
                    thumbnail_width: 150,
                    title: 'Ghost on Twitter: "Ghost 4.0 is out now! 🎉"',
                    type: 'rich',
                    version: '1.0',
                    width: 550
                },
                caption: 'caption text'
            });
            const {element} = embedNode.exportDOM(exportOptions);

            const expectedHtml = `
                <figure class="kg-card kg-embed-card kg-card-hascaption">
                    <div><blockquote class="twitter-tweet"><p lang="en" dir="ltr">Ghost 4.0 is out now! 🎉</p>— Ghost (@ghost) <a href="https://twitter.com/ghost/status/1395670367216619520?ref_src=twsrc%5Etfw">May 21, 2021</a></blockquote> <script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></div>
                    <figcaption>caption text</figcaption>
                </figure>
            `;

            const prettyExpectedHtml = Prettier.format(expectedHtml, {parser: 'html'});

            element.outerHTML.should.prettifyTo(prettyExpectedHtml);
        }));

        it('renders a twitter embed with api token data', editorTest(function () {
            // tweetdata is ignored unless sent via email
            const tweetData = {
                id: '1630581157568839683',
                created_at: '2023-02-28T14:50:17.000Z',
                author_id: '767545134',
                edit_history_tweet_ids: ['1630581157568839683'],
                public_metrics: {
                    retweet_count: 10,
                    reply_count: 2,
                    like_count: 38,
                    quote_count: 6,
                    impression_count: 10770
                },
                text: 'With the decline of traditional local news outlets, publishers like @MadisonMinutes, @RANGEMedia4all, and @sfsimplified are leading the charge in creating sustainable, community-driven journalism through websites and newsletters.\n' +
                    '\n' +
                    'Check out their impact 👇\n' +
                    'https://t.co/RdNNyY18Iv',
                lang: 'en',
                conversation_id: '1630581157568839683',
                possibly_sensitive: false,
                reply_settings: 'everyone'
            };

            const embedNode = $createEmbedNode({
                url: 'https://twitter.com/ghost/status/1395670367216619520',
                embedType: 'twitter',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Ghost 4.0 is out now! 🎉</p>&mdash; Ghost (@ghost) <a href="https://twitter.com/ghost/status/1395670367216619520?ref_src=twsrc%5Etfw">May 21, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
                metadata: {
                    tweet_data: tweetData,
                    height: 500,
                    provider_name: 'Twitter',
                    provider_url: 'https://twitter.com',
                    thumbnail_height: 150,
                    thumbnail_url: 'https://pbs.twimg.com/media/E1Y1q3bXMAU7m4n?format=jpg&name=small',
                    thumbnail_width: 150,
                    title: 'Ghost on Twitter: "Ghost 4.0 is out now! 🎉"',
                    type: 'rich',
                    version: '1.0',
                    width: 550
                },
                caption: 'caption text'
            });
            const {element} = embedNode.exportDOM(exportOptions);

            element.outerHTML.should.containEql('<blockquote class="twitter-tweet"');
        }));

        it('renders a twitter embed with api token data for email', editorTest(function () {
            const options = {
                target: 'email'
            };
            const tweetData = {
                id: '1630581157568839683',
                created_at: '2023-02-28T14:50:17.000Z',
                author_id: '767545134',
                edit_history_tweet_ids: ['1630581157568839683'],
                public_metrics: {
                    retweet_count: 10,
                    reply_count: 2,
                    like_count: 38,
                    quote_count: 6,
                    impression_count: 10770
                },
                text: 'With the decline of traditional local news outlets, publishers like @MadisonMinutes, @RANGEMedia4all, and @sfsimplified are leading the charge in creating sustainable, community-driven journalism through websites and newsletters.\n' +
                    '\n' +
                    'Check out their impact 👇\n' +
                    'https://t.co/RdNNyY18Iv',
                lang: 'en',
                conversation_id: '1630581157568839683',
                possibly_sensitive: false,
                reply_settings: 'everyone',
                entities: {
                    mentions: [
                        {
                            start: 68,
                            end: 83,
                            username: 'MadisonMinutes',
                            id: '1371572739333632001'
                        },
                        {
                            start: 85,
                            end: 100,
                            username: 'RANGEMedia4all',
                            id: '1448389854207770627'
                        },
                        {
                            start: 106,
                            end: 119,
                            username: 'sfsimplified',
                            id: '1351509902548738048'
                        }
                    ]
                }
            };

            const embedNode = $createEmbedNode({
                url: 'https://twitter.com/ghost/status/1395670367216619520',
                embedType: 'twitter',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Ghost 4.0 is out now! 🎉</p>&mdash; Ghost (@ghost) <a href="https://twitter.com/ghost/status/1395670367216619520?ref_src=twsrc%5Etfw">May 21, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
                metadata: {
                    tweet_data: tweetData,
                    height: 500,
                    provider_name: 'Twitter',
                    provider_url: 'https://twitter.com',
                    thumbnail_height: 150,
                    thumbnail_url: 'https://pbs.twimg.com/media/E1Y1q3bXMAU7m4n?format=jpg&name=small',
                    thumbnail_width: 150,
                    title: 'Ghost on Twitter: "Ghost 4.0 is out now! 🎉"',
                    type: 'rich',
                    version: '1.0',
                    width: 550
                },
                caption: 'caption text'
            });
            const {element} = embedNode.exportDOM({...exportOptions, ...options});

            element.outerHTML.should.containEql('<table cellspacing="0" cellpadding="0" border="0" class="kg-twitter-card">');
            element.outerHTML.should.containEql(`<a href="https://twitter.com/twitter/status/${tweetData.id}"`);
        }));

        it('renders video in email', editorTest(function () {
            const options = {
                target: 'email'
            };
            const embedNode = $createEmbedNode(youtubeEmbed);
            const {element} = embedNode.exportDOM({...exportOptions, ...options});
            
            element.outerHTML.should.containEql('<!--[if !mso !vml]-->');
            element.outerHTML.should.containEql('<a class="kg-video-preview"');
            element.outerHTML.should.containEql('<!--[if vml]>');
            element.outerHTML.should.containEql('<v:group xmlns');
        }));

        it('renders nothing with missing data', editorTest(function () {
            const embedNode = $createEmbedNode();
            const {element} = embedNode.exportDOM(exportOptions);

            element?.textContent.should.equal('');
            should(element?.outerHTML).be.undefined();
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

                    embedNode.getUrl().should.equal(dataset.url);
                    embedNode.getEmbedType().should.equal(dataset.embedType);
                    embedNode.getHtml().should.equal(dataset.html);
                    embedNode.getMetadata().should.deepEqual(dataset.metadata);
                    embedNode.getCaption().should.equal(dataset.caption);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            embedNode.hasEditMode().should.be.true;
        }));
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const embedNode = $createEmbedNode(dataset);
            const clonedEmbedNode = EmbedNode.clone(embedNode);
            $isEmbedNode(clonedEmbedNode).should.be.true;
            clonedEmbedNode.getUrl().should.equal(dataset.url);
        }));
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            EmbedNode.getType().should.equal('embed');
        }));

        it('urlTransformMap', editorTest(function () {
            EmbedNode.urlTransformMap.should.deepEqual({
                url: 'url'
            });
        }));
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
                const dom = (new JSDOM(html`<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].getEmbedType().should.equal('embed');
                nodes[0].getUrl().should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].getHtml().should.equal('<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
            }));

            it('medium youtube iframe', editorTest(function () {
                const dom = (new JSDOM(html`<figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].getEmbedType().should.equal('embed');
                nodes[0].getUrl().should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].getHtml().should.equal('<iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe>');
            }));

            it('wordpress youtube iframe', editorTest(function () {
                const dom = (new JSDOM(html`<figure class="wp-block-embed-youtube "><div class="wp-block-embed__wrapper"><span class="embed-youtube" style="text-align:center; display: block;"><iframe class=\'youtube-player\' type=\'text/html\' width=\'640\' height=\'360\' src=\'https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent\' allowfullscreen=\'true\' style=\'border:0;\'></iframe></span>\n</div></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].getEmbedType().should.equal('embed');
                nodes[0].getUrl().should.equal('https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent');
                nodes[0].getHtml().should.equal('<iframe class="youtube-player" type="text/html" width="640" height="360" src="https://www.youtube.com/embed/YTVID?version=3&amp;rel=1&amp;fs=1&amp;autohide=2&amp;showsearch=0&amp;showinfo=1&amp;iv_load_policy=1&amp;wmode=transparent" allowfullscreen="true" style="border: 0"></iframe>');
            }));

            it('youtube iframe with caption', editorTest(function () {
                const dom = (new JSDOM(html`<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><figcaption>My Video</figcaption></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getType().should.equal('embed');
                // nodes[0].getEmbedType().should.equal('embed');
                nodes[0].getUrl().should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].getHtml().should.equal('<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
                nodes[0].getCaption().should.equal('My Video');
            }));

            it('ignore iframe with relative src', editorTest(function () {
                const dom = (new JSDOM(html`<figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(0);
            }));
        });
        describe('iframe', function () {
            // These are iFrames without a <figure> but may have a <div> or <p> or nothing
            // WP Naked YouTube <div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>
            // Hubspot Naked YouTube <div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>

            it('youtube iframe with single wrapper div', editorTest(function () {
                const dom = (new JSDOM(html`<div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getUrl().should.equal('https://www.youtube.com/embed/YTVID?feature=oembed');
                nodes[0].getHtml().should.equal('<iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>');
            }));

            it('youtube iframe with double wrapper div + schemaless url', editorTest(function () {
                const dom = (new JSDOM(html`<div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getUrl().should.equal('https://www.youtube.com/embed/YTVID');
                nodes[0].getHtml().should.prettifyTo('<iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="https://www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe>');
            }));
        });
        
        describe('figure blockquote', function () {
            // Twitter
            // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["embed",{"url":"https://twitter.com/iamdevloper/status/1133348012439220226","html":"<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href=\"https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw\">May 28, 2019</a></blockquote>\n<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>\n","type":"rich"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}
            // Ghost HTML <!--kg-card-begin: embed--><figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure><!--kg-card-end: embed-->
            // Medium Export HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>
            // Medium Live HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><iframe data-width="500" data-height="281" width="500" height="281" data-src="/media/6969?postId=890" data-media-id="6969" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1071055431215276033%2FU9-RIlDs_400x400.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/6969?postId=890"></iframe></figure>

            it('twitter blockquote', editorTest(function () {
                const dom = (new JSDOM(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getUrl().should.equal('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                nodes[0].getHtml().should.prettifyTo('<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }));

            it('twitter medium blockquote', editorTest(function () {
                const dom = (new JSDOM(html`<figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getUrl().should.equal('https://twitter.com/iamdevloper/status/1133348012439220226');
                nodes[0].getHtml().should.prettifyTo('<blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }));

            it('twitter blockquote with caption', editorTest(function () {
                const dom = (new JSDOM(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption>A Tweet</figcaption></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getUrl().should.equal('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                nodes[0].getHtml().should.prettifyTo('<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
                nodes[0].getCaption().should.equal('A Tweet');
            }));

            it('twitter blockquote with linked caption', editorTest(function () {
                const dom = (new JSDOM(html`<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption><a href="https://twitter.com">A Tweet</a></figcaption></figure>`)).window.document;
                const nodes = $generateNodesFromDOM(editor, dom);

                nodes.length.should.equal(1);
                nodes[0].getUrl().should.equal('https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw');
                nodes[0].getHtml().should.prettifyTo('<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>');
                nodes[0].getCaption().should.equal('<a href="https://twitter.com">A Tweet</a>');
            }));
        });
    });
});
