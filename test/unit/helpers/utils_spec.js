const should = require('should');
const helperUtils = require('@tryghost/helpers').utils;

describe('Helpers Utils', function () {
    describe('Word Count', function () {
        it('[success] can count words', function () {
            var html = 'Some words here',
                result = helperUtils.countWords(html);

            result.should.equal(3);
        });

        it('[success] sanitized HTML tags', function () {
            var html = '<p>This is a text example! Count me in ;)</p>',
                result = helperUtils.countWords(html);

            result.should.equal(8);
        });

        it('[success] sanitized non alpha-numeric characters', function () {
            var html = '<p>This is a text example! I love Döner. Especially number 875.</p>',
                result = helperUtils.countWords(html);

            result.should.equal(11);
        });

        it('[success] counted Chinese characters', function () {
            var html = '<p>我今天在家吃了好多好多好吃的，现在的我非常开心非常满足</p>',
                result = helperUtils.countWords(html);

            result.should.equal(26);
        });

        it('[success] sanitized white space correctly', function () {
            var html = ' <p> This is a text example!\n Count   me in ;)</p> ',
                result = helperUtils.countWords(html);

            result.should.equal(8);
        });
    });

    describe('Image Count', function () {
        it('[success] can count images', function () {
            var html = '<p>This is a <img src="hello.png"> text example! Count me in ;)</p><img src="hello.png">',
                result = helperUtils.countImages(html);

            result.should.equal(2);
        });
    });
});
