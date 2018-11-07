const _ = require('lodash'),
    common = require('../../../../lib/common'),
    models = require('../../../../models'),
    message1 = 'Removing demo post.',
    message2 = 'Removed demo post.',
    message3 = 'Rollback: Bring back demo post.',
    message4 = 'Skip: Demo post was already removed.',
    message5 = 'Skip: Demo post exists.';

const demoPost = {
    title: 'Koenig Demo Post',
    slug: 'v2-demo-post',
    mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[["hr",{}],["embed",{"url":"https://twitter.com/TryGhost/status/761119175192420352","html":"<blockquote class=\\"twitter-tweet\\"><p lang=\\"en\\" dir=\\"ltr\\">Fun announcement coming this afternoon 🙈 what could it be?</p>&mdash; Ghost (@TryGhost) <a href=\\"https://twitter.com/TryGhost/status/761119175192420352?ref_src=twsrc%5Etfw\\">August 4, 2016</a></blockquote>\\n<script async src=\\"https://platform.twitter.com/widgets.js\\" charset=\\"utf-8\\"></script>\\n","type":"rich"}],["image",{"src":"https://static.ghost.org/v1.25.0/images/koenig-demo-1.jpg","alt":"","caption":"A regular size image"}],["image",{"src":"https://static.ghost.org/v1.25.0/images/koenig-demo-2.jpg","alt":"","cardWidth":"full","caption":"It\'s wide"}],["image",{"src":"https://static.ghost.org/v1.25.0/images/koenig-demo-3.jpg","alt":"","cardWidth":"wide","caption":"It\'s wider, but not widest"}],["markdown",{"markdown":"Markdown content works just the way it always did, **simply** and *beautifully*."}],["code",{"code":".new-editor {\\n\\tdisplay: bock;\\n}"}],["embed",{"url":"https://www.youtube.com/watch?v=CfeQTuGyiqU","html":"<iframe width=\\"480\\" height=\\"270\\" src=\\"https://www.youtube.com/embed/CfeQTuGyiqU?feature=oembed\\" frameborder=\\"0\\" allow=\\"autoplay; encrypted-media\\" allowfullscreen></iframe>","type":"video"}],["html",{"html":"<div style=\\"background:#fafafa;margin-bottom:1.5em;padding:20px 50px;\\">\\n    <blink>hello world</blink>\\n</div>"}]],"markups":[["strong"],["code"],["em"],["a",["href","https://forum.ghost.org/t/ghost-2-0-theme-compatibility-help-support/2103"]]],"sections":[[1,"p",[[0,[],0,"Hey there! Welcome to the new Ghost editor - affectionately known as "],[0,[0],1,"Koenig"],[0,[],0,"."]]],[1,"p",[[0,[],0,"Koenig is a brand new writing experience within Ghost, and follows more of a rich writing experience which you\'ve come to expect from the best publishing platforms. Don\'t worry though! You can still use Markdown too, if that\'s what you prefer."]]],[1,"p",[[0,[],0,"Because there are some changes to how Ghost outputs content using its new editor, we dropped this draft post into your latest update to tell you a bit about it – and simultaneously give you a chance to preview how well your theme handles these changes. So after reading this post you should both understand how everything works, and also be able to see if there are any changes you need to make to your theme in order to upgrade to Ghost 2.0."]]],[10,0],[1,"h1",[[0,[],0,"What\'s new"]]],[1,"p",[[0,[],0,"The new editor is designed to allow you have a more rich editing experience, so it\'s no longer limited to just text and formatting options – but it can also handle rich media objects, called cards. You can insert a card either by clicking on the "],[0,[1],1,"+"],[0,[],0," button on a new line, or typing "],[0,[1],1,"/"],[0,[],0," on a new line to search for a particular card. "]]],[1,"p",[[0,[],0,"Here\'s one now:"]]],[10,1],[1,"p",[[0,[],0,"Cards are rich objects which contain content which is more than just text. To start with there are cards for things like images, markdown, html and embeds — but over time we\'ll introduce more cards and integrations, as well as allowing you to create your own!"]]],[1,"h2",[[0,[],0,"Some examples of possible future cards"]]],[3,"ul",[[[0,[],0,"A chart card to display dynamic data visualisations"]],[[0,[],0,"A recipe card to show a pre-formatted list of ingredients and instructions"]],[[0,[],0,"A Mailchimp card to capture new subscribers with a web form"]],[[0,[],0,"A recommended reading card to display a dynamic suggested story based on the current user\'s reading history"]]]],[1,"p",[[0,[],0,"For now, though, we\'re just getting started with the basics."]]],[1,"h1",[[0,[],0,"New ways to work with images"]]],[1,"p",[[0,[],0,"Perhaps the most notable change to how you\'re used to interacting with Ghost is in the images. In Koenig, they\'re both more powerful and easier to work with in the editor itself - and in the theme, they\'re output slightly differently with different size options."]]],[1,"p",[[0,[],0,"For instance, here\'s your plain ol\' regular image:"]]],[10,2],[1,"p",[[0,[],0,"But perhaps you\'ve got a striking panorama that you really want to stand out as your readers scroll down the page. In that case, you could use the new full-bleed image size which stretches right out to the edges of the screen:"]]],[10,3],[1,"p",[[0,[],0,"Or maybe you\'re looking for something in between, which will give you just a little more size to break up the vertical rhythm of the post without dominating the entire screen. If that\'s the case, you might like the breakout size:"]]],[10,4],[1,"p",[[0,[],0,"Each of these sizes can be selected from within the editor, and each will output a number of HTML classes for the theme to do styling with. "]]],[1,"p",[[0,[],0,"Chances are your theme will need a few small updates to take advantage of the new editor functionality. Some people might also find they need to tweak their theme layout, as the editor canvas previously output a wrapper div around its content – but no longer does. If you rely on that div for styling, you can always add it back again in your theme."]]],[1,"p",[[0,[],0,"Oh, we have some nice new image captions, too :)"]]],[1,"h1",[[0,[],0,"What else?"]]],[1,"p",[[0,[],0,"Well, you can still write Markdown, as mentioned. In fact you\'ll find the entire previous Ghost editor "],[0,[2],1,"inside"],[0,[],0," this editor. If you want to use it then just go ahead and add a Markdown card and start writing like nothing changed at all:"]]],[10,5],[1,"p",[[0,[],0,"of course you can embed code blocks"]]],[10,6],[1,"p",[[0,[],0,"or embed things from external services like YouTube..."]]],[10,7],[1,"p",[[0,[],0,"and yeah you can do full HTML if you need to, as well!"]]],[10,8],[1,"p",[[0,[],0,"So everything works, hopefully, just about how you would expect. It\'s like the old editor, but faster, cleaner, prettier, and a whole lot more powerful."]]],[1,"h1",[[0,[],0,"What do I do with this information?"]]],[1,"p",[[0,[],0,"Preview this post on your site to see if it causes any issues with your theme. Click on the settings cog in the top right 👉🏼 corner of the editor, then click on \'"],[0,[0],1,"Preview"],[0,[],0,"\' next to the \'Post URL\' input."]]],[1,"p",[[0,[],0,"If everything looks good to you then there\'s nothing you need to do, you\'re all set! If you spot any issues with your design, or there are some funky display issues, then you might need to make some updates to your theme based on the new editor classes being output."]]],[1,"p",[[0,[],0,"Head over to the "],[0,[3],1,"Ghost 2.0 Theme Compatibility"],[0,[],0," forum topic to discuss any changes and get help if needed."]]],[1,"p",[[0,[],0,"That\'s it!"]]],[1,"p",[[0,[],0,"We\'re looking forward to sharing more about the new editor soon"]]]]}',
    plaintext: 'Hey there! Welcome to the new Ghost editor - affectionately known as Koenig.\n\nKoenig is a brand new writing experience within Ghost, and follows more of a\nrich writing experience which you\'ve come to expect from the best publishing\nplatforms. Don\'t worry though! You can still use Markdown too, if that\'s what\nyou prefer.\n\nBecause there are some changes to how Ghost outputs content using its new\neditor, we dropped this draft post into your latest update to tell you a bit\nabout it – and simultaneously give you a chance to preview how well your theme\nhandles these changes. So after reading this post you should both understand how\neverything works, and also be able to see if there are any changes you need to\nmake to your theme in order to upgrade to Ghost 2.0.\n\n\n--------------------------------------------------------------------------------\n\nWhat\'s new\nThe new editor is designed to allow you have a more rich editing experience, so\nit\'s no longer limited to just text and formatting options – but it can also\nhandle rich media objects, called cards. You can insert a card either by\nclicking on the +  button on a new line, or typing /  on a new line to search\nfor a particular card. \n\nHere\'s one now:\n\nFun announcement coming this afternoon 🙈 what could it be?\n\n— Ghost (@TryGhost) August 4, 2016\n[https://twitter.com/TryGhost/status/761119175192420352?ref_src=twsrc%5Etfw]\nCards are rich objects which contain content which is more than just text. To\nstart with there are cards for things like images, markdown, html and embeds —\nbut over time we\'ll introduce more cards and integrations, as well as allowing\nyou to create your own!\n\nSome examples of possible future cards\n * A chart card to display dynamic data visualisations\n * A recipe card to show a pre-formatted list of ingredients and instructions\n * A Mailchimp card to capture new subscribers with a web form\n * A recommended reading card to display a dynamic suggested story based on the\n   current user\'s reading history\n\nFor now, though, we\'re just getting started with the basics.\n\nNew ways to work with images\nPerhaps the most notable change to how you\'re used to interacting with Ghost is\nin the images. In Koenig, they\'re both more powerful and easier to work with in\nthe editor itself - and in the theme, they\'re output slightly differently with\ndifferent size options.\n\nFor instance, here\'s your plain ol\' regular image:\n\nA regular size imageBut perhaps you\'ve got a striking panorama that you really\nwant to stand out as your readers scroll down the page. In that case, you could\nuse the new full-bleed image size which stretches right out to the edges of the\nscreen:\n\nIt\'s wideOr maybe you\'re looking for something in between, which will give you\njust a little more size to break up the vertical rhythm of the post without\ndominating the entire screen. If that\'s the case, you might like the breakout\nsize:\n\nIt\'s wider, but not widestEach of these sizes can be selected from within the\neditor, and each will output a number of HTML classes for the theme to do\nstyling with. \n\nChances are your theme will need a few small updates to take advantage of the\nnew editor functionality. Some people might also find they need to tweak their\ntheme layout, as the editor canvas previously output a wrapper div around its\ncontent – but no longer does. If you rely on that div for styling, you can\nalways add it back again in your theme.\n\nOh, we have some nice new image captions, too :)\n\nWhat else?\nWell, you can still write Markdown, as mentioned. In fact you\'ll find the entire\nprevious Ghost editor inside  this editor. If you want to use it then just go\nahead and add a Markdown card and start writing like nothing changed at all:\n\nMarkdown content works just the way it always did, simply  and beautifully.\n\nof course you can embed code blocks\n\n.new-editor {\n\tdisplay: bock;\n}\n\nor embed things from external services like YouTube...\n\nand yeah you can do full HTML if you need to, as well!\n\nhello worldSo everything works, hopefully, just about how you would expect. It\'s\nlike the old editor, but faster, cleaner, prettier, and a whole lot more\npowerful.\n\nWhat do I do with this information?\nPreview this post on your site to see if it causes any issues with your theme.\nClick on the settings cog in the top right 👉🏼 corner of the editor, then click\non \'Preview\' next to the \'Post URL\' input.\n\nIf everything looks good to you then there\'s nothing you need to do, you\'re all\nset! If you spot any issues with your design, or there are some funky display\nissues, then you might need to make some updates to your theme based on the new\neditor classes being output.\n\nHead over to the Ghost 2.0 Theme Compatibility\n[https://forum.ghost.org/t/ghost-2-0-theme-compatibility-help-support/2103] \nforum topic to discuss any changes and get help if needed.\n\nThat\'s it!\n\nWe\'re looking forward to sharing more about the new editor soon',
    feature_image: '',
    featured: false,
    page: false,
    status: 'draft',
    meta_title: null,
    meta_description: null,
    created_by: '5951f5fca366002ebd5dbef7',
    published_by: null,
    author_id: '5951f5fca366002ebd5dbef7'
};

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    let localOptions = _.merge({
        context: {internal: true},
        columns: ['id'],
        migrating: true
    }, options);

    return models.Post.findOne({slug: 'v2-demo-post', status: 'all'}, localOptions)
        .then(function (postModel) {
            if (!postModel) {
                common.logging.warn(message4);
                return;
            }

            common.logging.info(message1);

            // @NOTE: raw knex query, because of https://github.com/TryGhost/Ghost/issues/9983
            return options
                .transacting('posts_authors')
                .where('post_id', postModel.id)
                .del()
                .then(() => {
                    return options
                        .transacting('posts')
                        .where('id', postModel.id)
                        .del();
                });
        })
        .then(() => {
            common.logging.info(message2);
        });
};

module.exports.down = (options) => {
    let localOptions = _.merge({
        context: {internal: true},
        columns: ['id'],
        migrating: true
    }, options);

    return models.Post.findOne({slug: 'v2-demo-post', status: 'all'}, localOptions)
        .then(function (postModel) {
            if (postModel) {
                common.logging.warn(message5);
                return;
            }

            common.logging.info(message3);
            return models.Post.add(demoPost, localOptions);
        });
};
