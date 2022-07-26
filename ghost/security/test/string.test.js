require('./utils');
const security = require('../');

describe('Lib: Security - String', function () {
    describe('Safe String', function () {
        const options = {};

        it('should remove beginning and ending whitespace', function () {
            const result = security.string.safe(' stringwithspace ', options);
            result.should.equal('stringwithspace');
        });

        it('can handle null strings', function () {
            const result = security.string.safe(null);
            result.should.equal('');
        });

        it('should remove non ascii characters', function () {
            const result = security.string.safe('howtowin✓', options);
            result.should.equal('howtowin');
        });

        it('should replace spaces with dashes', function () {
            const result = security.string.safe('how to win', options);
            result.should.equal('how-to-win');
        });

        it('should replace most special characters with dashes', function () {
            const result = security.string.safe('a:b/c?d#e[f]g!h$i&j(k)l*m+n,o;{p}=q\\r%s<t>u|v^w~x£y"z@1.2`3', options);
            result.should.equal('a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z-1-2-3');
        });

        it('should replace all of the html4 compat symbols in ascii except hyphen and underscore', function () {
            // note: This is missing the soft-hyphen char that isn't much-liked by linters/browsers/etc,
            // it passed the test before it was removed
            const result = security.string.safe('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿');
            result.should.equal('_-c-y-ss-c-a-r-deg-23up-1o-1-41-23-4');
        });

        it('should replace all of the foreign chars in ascii', function () {
            const result = security.string.safe('ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ');
            result.should.equal('aaaaaaaeceeeeiiiidnoooooxouuuuuthssaaaaaaaeceeeeiiiidnooooo-ouuuuythy');
        });

        it('should remove special characters at the beginning of a string', function () {
            const result = security.string.safe('.Not special', options);
            result.should.equal('not-special');
        });

        it('should remove apostrophes ', function () {
            const result = security.string.safe('how we shouldn\'t be', options);
            result.should.equal('how-we-shouldnt-be');
        });

        it('should convert to lowercase', function () {
            const result = security.string.safe('This has Upper Case', options);
            result.should.equal('this-has-upper-case');
        });

        it('should convert multiple dashes into a single dash', function () {
            const result = security.string.safe('This :) means everything', options);
            result.should.equal('this-means-everything');
        });

        it('should remove trailing dashes from the result', function () {
            const result = security.string.safe('This.', options);
            result.should.equal('this');
        });

        it('should handle pound signs', function () {
            const result = security.string.safe('WHOOPS! I spent all my £ again!', options);
            result.should.equal('whoops-i-spent-all-my-again');
        });

        it('should properly handle unicode punctuation conversion', function () {
            const result = security.string.safe('に間違いがないか、再度確認してください。再読み込みしてください。', options);
            result.should.equal('nijian-wei-iganaika-zai-du-que-ren-sitekudasai-zai-du-miip-misitekudasai');
        });

        it('should not lose or convert dashes if options are passed with truthy importing flag', function () {
            let result = security.string.safe('-slug-with-starting-ending-and---multiple-dashes-', {importing: true});
            result.should.equal('-slug-with-starting-ending-and---multiple-dashes-');
        });

        it('should still remove/convert invalid characters when passed options with truthy importing flag', function () {
            let result = security.string.safe('-slug-&with-✓-invalid-characters-に\'', {importing: true});
            result.should.equal('-slug--with--invalid-characters-ni');
        });
    });
});
