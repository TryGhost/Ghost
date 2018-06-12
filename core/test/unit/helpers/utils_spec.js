var should = require('should'),
    helperUtils = require('../../../server/helpers/utils');

describe('Helpers Utils', function () {
    describe('Word Count', function () {
        it('[success] can count words', function () {
            var html = 'Some words here',
                result = helperUtils.wordCount(html);

            result.should.equal(3);
        });

        it('[success] sanitized HTML tags', function () {
            var html = '<div class="kg-card-markdown"><p>This is a text example! Count me in ;)</p></div>',
                result = helperUtils.wordCount(html);

            result.should.equal(8);
        });

        it('[success] sanitized non alpha-numeric characters', function () {
            var html = '<div class="kg-card-markdown"><p>This is a text example! I love Döner. Especially number 875.</p></div>',
                result = helperUtils.wordCount(html);

            result.should.equal(11);
        });

        it('[success] counted Chinese characters', function () {
            var html = '<div class="kg-card-markdown"><p>我今天在家吃了好多好多好吃的，现在的我非常开心非常满足</p></div>',
                result = helperUtils.wordCount(html);

            result.should.equal(26);
        });

        it('[success] sanitized white space correctly', function () {
            var html = ' <div class="kg-card-markdown"><p> This is a text example!\n Count   me in ;)</p></div> ',
                result = helperUtils.wordCount(html);

            result.should.equal(8);
        });
    });

    describe('Image Count', function () {
        it('[success] can count images', function () {
            var html = '<div class="kg-card-markdown"><p>This is a <img src="hello.png"> text example! Count me in ;)</p><img src="hello.png"></div>',
                result = helperUtils.imageCount(html);

            result.should.equal(2);
        });
    });
});
