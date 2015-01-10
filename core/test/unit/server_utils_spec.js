/*globals describe, it*/
/*jshint expr:true*/
var should          = require('should'),
    utils           = require('../../server/utils');

// To stop jshint complaining
should.equal(true, true);

describe('Safe String', function () {
    var safeString = utils.safeString;

    it('should remove beginning and ending whitespace', function () {
        var result = safeString(' stringwithspace ');
        result.should.equal('stringwithspace');
    });

    it('should remove non ascii characters', function () {
        var result = safeString('howtowin✓');
        result.should.equal('howtowin');
    });

    it('should replace spaces with dashes', function () {
        var result = safeString('how to win');
        result.should.equal('how-to-win');
    });

    it('should replace most special characters with dashes', function () {
        var result = safeString('a:b/c?d#e[f]g!h$i&j(k)l*m+n,o;p=q\\r%s<t>u|v^w~x£y"z@1.2');
        result.should.equal('a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z-1-2');
    });

    it('should remove special characters at the beginning of a string', function () {
        var result = safeString('.Not special');
        result.should.equal('not-special');
    });

    it('should remove apostrophes ', function () {
        var result = safeString('how we shouldn\'t be');
        result.should.equal('how-we-shouldnt-be');
    });

    it('should convert to lowercase', function () {
        var result = safeString('This has Upper Case');
        result.should.equal('this-has-upper-case');
    });

    it('should convert multiple dashes into a single dash', function () {
        var result = safeString('This :) means everything');
        result.should.equal('this-means-everything');
    });

    it('should remove trailing dashes from the result', function () {
        var result = safeString('This.');
        result.should.equal('this');
    });

    it('should handle pound signs', function () {
        var result = safeString('WHOOPS! I spent all my £ again!');
        result.should.equal('whoops-i-spent-all-my-again');
    });

    it('should properly handle unicode punctuation conversion', function () {
        var result = safeString('に間違いがないか、再度確認してください。再読み込みしてください。');
        result.should.equal('nijian-wei-iganaika-zai-du-que-ren-sitekudasai-zai-du-miip-misitekudasai');
    });
});
