const i18nLib = require('@tryghost/i18n');
const should = require('should');
const CommentsServiceEmailRenderer = require('../../../../../core/server/services/comments/CommentsServiceEmailRenderer');

describe('Comments Service Email Renderer', function () {
    describe('renderEmail Template with different locales', function () {
        it('should render html and text templates with English locale', async function () {
            // arrange
            const i18n = i18nLib('en', 'ghost');
            const renderer = new CommentsServiceEmailRenderer({t: i18n.t});

            const templateData = {
                postTitle: 'Test Post',
                postUrl: 'https://ghost.org/post',
                siteUrl: 'https://ghost.org'
            };

            // act
            const result = await renderer.renderEmailTemplate('new-comment-reply', templateData);

            // assert
            should(result.html).containEql('Hey there,</p>');
            should(result.html).containEql('This message was sent from <a class="small" href="https://ghost.org"');
            should(result.html).containEql('Someone just replied to your comment on <a href="https://ghost.org/post"');
            should(result.text).containEql('Hey there,');
            should(result.text).containEql('Someone just replied to your comment on Test Post.');
        });

        it('should correctly handle apostrophes in post titles and site names', async function () {
            // arrange
            const i18n = i18nLib('en', 'ghost');
            const renderer = new CommentsServiceEmailRenderer({t: i18n.t});

            const templateData = {
                postTitle: 'Test post\'s the best post',
                siteUrl: 'https://ghost.org',
                siteDomain: 'Cathy\'s blog'
            };

            // act
            const result = await renderer.renderEmailTemplate('new-comment-reply', templateData);

            // assert
            should(result.html).containEql('Hey there,</p>');
            should(result.html).containEql('This message was sent from <a class="small" href="https://ghost.org" style="text-decoration: underline; color: #738A94; font-size: 11px;">Cathy\'s blog</a>');
            should(result.text).containEql('Someone just replied to your comment on Test post\'s the best post.');
        });

        it('should render html and text templates with German locale', async function () {
            // arrange
            const i18n = i18nLib('de', 'ghost');
            const renderer = new CommentsServiceEmailRenderer({t: i18n.t});

            const templateData = {
                postTitle: 'Testbeitrag',
                postUrl: 'https://ghost.de/post',
                siteUrl: 'https://ghost.de'
            };

            // act
            const result = await renderer.renderEmailTemplate('new-comment-reply', templateData);

            // assert
            should(result.html).containEql('Hallo,</p>');
            should(result.html).containEql('Diese Nachricht wurde von <a class="small" href="https://ghost.de"');
            should(result.html).containEql('Jemand hat auf deinen Kommentar zu <a href="https://ghost.de/post"');
            should(result.text).containEql('Hallo,');
            should(result.text).containEql('Jemand hat auf deinen Kommentar zu Testbeitrag geantwortet.');
        });
    });
});
