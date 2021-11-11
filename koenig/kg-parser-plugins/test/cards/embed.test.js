// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const {JSDOM} = require('jsdom');
const {createParserPlugins} = require('../../');
const PostNodeBuilder = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/models/post-node-builder').default;
const DOMParser = require('@tryghost/mobiledoc-kit/dist/commonjs/mobiledoc-kit/parsers/dom').default;

const buildDOM = function (html) {
    // the <body> wrapper is needed to retain the first comment if `html` starts
    // with one, this matches general DOM Parsing behaviour so we should always
    // be careful to wrap content any time we're converting fragments
    return (new JSDOM(`<body>${html}</body>`)).window.document.body;
};

describe('parser-plugins: embed card', function () {
    let builder, parser, plugins;

    before(function () {
        plugins = createParserPlugins({
            createDocument(html) {
                return (new JSDOM(html)).window.document;
            }
        });
    });

    beforeEach(function () {
        builder = new PostNodeBuilder();
        parser = new DOMParser(builder, {plugins});
    });

    afterEach(function () {
        builder = null;
        parser = null;
    });

    describe('figureIframeToEmbed', function () {
        // YouTube (same structure used for vimeo, instagram, etc)
        // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["embed",{"url":"https://www.youtube.com/watch?v=YTVID","html":"<iframe width=\"480\" height=\"270\" src=\"https://www.youtube.com/embed/YTVID?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe>","type":"video"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}
        // Ghost HTML <!--kg-card-begin: embed--><figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure><!--kg-card-end: embed-->
        // Medium Export HTML <figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>
        // Medium Live HTML <figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>
        // WP <figure class=\"wp-block-embed-youtube \"><div class=\"wp-block-embed__wrapper\">\n<span class=\"embed-youtube\" style=\"text-align:center; display: block;\"><iframe class='youtube-player' type='text/html' width='640' height='360' src='https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent' allowfullscreen='true' style='border:0;'></iframe></span>\n</div></figure>

        it('parses youtube iframe into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>'
            });
        });

        it('parses medium youtube iframe into embed card', function () {
            const dom = buildDOM('<figure name="abc" id="abc" class="graf graf--figure graf--iframe graf-after--p"><iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe src="https://www.youtube.com/embed/YTVID?feature=oembed" width="700" height="393" frameborder="0" scrolling="no"></iframe>'
            });
        });

        it('parses wordpress youtube iframe into embed card', function () {
            const dom = buildDOM('<figure class="wp-block-embed-youtube "><div class="wp-block-embed__wrapper"><span class="embed-youtube" style="text-align:center; display: block;"><iframe class=\'youtube-player\' type=\'text/html\' width=\'640\' height=\'360\' src=\'https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent\' allowfullscreen=\'true\' style=\'border:0;\'></iframe></span>\n</div></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?version=3&rel=1&fs=1&autohide=2&showsearch=0&showinfo=1&iv_load_policy=1&wmode=transparent',
                html: '<iframe class="youtube-player" type="text/html" width="640" height="360" src="https://www.youtube.com/embed/YTVID?version=3&amp;rel=1&amp;fs=1&amp;autohide=2&amp;showsearch=0&amp;showinfo=1&amp;iv_load_policy=1&amp;wmode=transparent" allowfullscreen="true" style="border:0;"></iframe>'
            });
        });

        it('parses youtube iframe with caption into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><figcaption>My Video</figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>',
                caption: 'My Video'
            });
        });

        it('ignores iframe with relative src', function () {
            const dom = buildDOM('<figure><iframe data-width="854" data-height="480" width="700" height="393" data-src="/media/345?postId=567" data-media-id="345" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FYTVID%2Fhqdefault.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/345?postId=567"></iframe></figure>');
            const sections = parser.parse(dom).sections.toArray();

            sections.should.have.lengthOf(0);
        });
    });

    describe('iframeToEmbed', function () {
        // These are iFrames without a <figure> but may have a <div> or <p> or nothing
        // WP Naked YouTube <div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>
        // Hubspot Naked YouTube <div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>

        it('parses a youtube iframe with a single wrapper div into an embed card', function () {
            const dom = buildDOM('<div class="video-container"><iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID?feature=oembed',
                html: '<iframe width="640" height="360" src="https://www.youtube.com/embed/YTVID?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen=""></iframe>'
            });
        });

        it('parses a youtube iframe with a double wrapper div + schemaless URL into an embed card', function () {
            const dom = buildDOM('<div class="hs-responsive-embed-wrapper hs-responsive-embed" style="width: 100%; height: auto; position: relative; overflow: hidden; padding: 0; min-width: 256px; margin: 0px auto; display: block; margin-left: auto; margin-right: auto;"><div class="hs-responsive-embed-inner-wrapper" style="position: relative; overflow: hidden; max-width: 100%; padding-bottom: 56.25%; margin: 0;"><iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="//www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe></div></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://www.youtube.com/embed/YTVID',
                html: '<iframe class="hs-responsive-embed-iframe hs-fullwidth-embed" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" xml="lang" src="https://www.youtube.com/embed/YTVID" width="560" height="315" allowfullscreen="" data-service="youtube"></iframe>'
            });
        });
    });

    describe('figureBlockquoteToEmbed', function () {
        // Twitter
        // Mobiledoc {"version":"0.3.1","atoms":[],"cards":[["embed",{"url":"https://twitter.com/iamdevloper/status/1133348012439220226","html":"<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href=\"https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw\">May 28, 2019</a></blockquote>\n<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>\n","type":"rich"}]],"markups":[],"sections":[[10,0],[1,"p",[]]]}
        // Ghost HTML <!--kg-card-begin: embed--><figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure><!--kg-card-end: embed-->
        // Medium Export HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>
        // Medium Live HTML <figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><iframe data-width="500" data-height="281" width="500" height="281" data-src="/media/6969?postId=890" data-media-id="6969" data-thumbnail="https://i.embed.ly/1/image?url=https%3A%2F%2Fpbs.twimg.com%2Fprofile_images%2F1071055431215276033%2FU9-RIlDs_400x400.jpg&amp;key=abc" class="progressiveMedia-iframe js-progressiveMedia-iframe" allowfullscreen="" frameborder="0" src="/media/6969?postId=890"></iframe></figure>

        it('parses twitter blockquote into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
            });
        });

        it('parses medium twitter blockquote into embed card', function () {
            const dom = buildDOM('<figure name="7b98" id="7b98" class="graf graf--figure graf--iframe graf-after--p graf--trailing"><blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226',
                html: '<blockquote class="twitter-tweet"><a href="https://twitter.com/iamdevloper/status/1133348012439220226"></a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
            });
        });

        it('parses twitter blockquote with caption into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption>A Tweet</figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
                caption: 'A Tweet'
            });
        });

        it('parses twitter blockquote with linked caption into embed card', function () {
            const dom = buildDOM('<figure class="kg-card kg-embed-card"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see &quot;blockchain engineer&quot;, I hear &quot;fancy spreadsheet admin&quot;.</p>&mdash; I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script><figcaption><a href="https://twitter.com">A Tweet</a></figcaption></figure>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('embed');
            section.payload.should.deepEqual({
                url: 'https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw',
                html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I see "blockchain engineer", I hear "fancy spreadsheet admin".</p>— I Am Devloper (@iamdevloper) <a href="https://twitter.com/iamdevloper/status/1133348012439220226?ref_src=twsrc%5Etfw">May 28, 2019</a></blockquote><script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
                caption: '<a href="https://twitter.com">A Tweet</a>'
            });
        });
    });

    describe('mixtapeEmbed', function () {
        // Mobiledoc {\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"bookmark\",{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"metadata\":{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"title\":\"TypeScript at Slack\",\"description\":\"When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…\",\"author\":\"Felix Rieseberg\",\"publisher\":\"Several People Are Coding\",\"thumbnail\":\"https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png\",\"icon\":\"https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png\"},\"type\":\"bookmark\"}]],\"markups\":[],\"sections\":[[10,0],[1,\"p\",[]]]}
        // Ghost HTML <figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://slack.engineering/typescript-at-slack-a81307fa288d"><div class="kg-bookmark-content"><div class="kg-bookmark-title">TypeScript at Slack</div><div class="kg-bookmark-description">When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png"><span class="kg-bookmark-author">Felix Rieseberg</span><span class="kg-bookmark-publisher">Several People Are Coding</span></div></div><div class="kg-bookmark-thumbnail"><img src="https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png"></div></a></figure>
        // Medium Export HTML <div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>
        it('parses mixtape block with all data', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'publisher', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.publisher.should.eql('slack.engineering');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing title', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--mixtapeEmbed"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'publisher', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.publisher.should.eql('slack.engineering');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing description', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--mixtapeEmbed"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'publisher', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('');
            metadata.publisher.should.eql('slack.engineering');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing publisher, but BR is present', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em></a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });

        it('parses mixtape block with missing publisher + no additional br', function () {
            const dom = buildDOM('<div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em></a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>');
            const [section] = parser.parse(dom).sections.toArray();

            section.type.should.equal('card-section');
            section.name.should.equal('bookmark');
            section.payload.should.be.an.Object().with.properties('url', 'metadata');
            section.payload.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            section.payload.metadata.should.be.an.Object().with.properties('url', 'title', 'description', 'thumbnail');

            let metadata = section.payload.metadata;
            metadata.url.should.eql('https://slack.engineering/typescript-at-slack-a81307fa288d');
            metadata.title.should.eql('TypeScript at Slack');
            metadata.description.should.eql('Or, How I Learned to Stop Worrying &amp; Trust the Compiler');
            metadata.thumbnail.should.eql('https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png');
        });
    });
});
