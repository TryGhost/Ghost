var should = require('should'), // jshint ignore:line
    wordCount = require('../../../server/utils/word-count');

describe('wordCount', function () {
    it('[success] can count words', function () {
        var html = 'Some words here',
            result = wordCount(html);

        result.should.equal(3);
    });

    it('[success] sanitized HTML tags', function () {
        var html = '<div class="kg-card-markdown"><p>This is a text example! Count me in ;)</p></div>',
            result = wordCount(html);

        result.should.equal(8);
    });

    it('[success] sanitized non alpha-numeric characters', function () {
        var html = '<div class="kg-card-markdown"><p>This is a text example! I love Döner. Especially number 875.</p></div>',
            result = wordCount(html);

        result.should.equal(11);
    });

    it('[success] sanitized white space correctly', function () {
        var html = ' <div class="kg-card-markdown"><p> This is a text example!\n Count   me in ;)</p></div> ',
            result = wordCount(html);

        result.should.equal(8);
    });
});
