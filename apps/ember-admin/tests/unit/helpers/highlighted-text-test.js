import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';
import {
    highlightedText
} from 'ghost-admin/helpers/highlighted-text';

describe('Unit: Helper: highlighted-text', function () {
    it('works', function () {
        let result = highlightedText(['Test', 'e']);
        expect(result).to.be.an('object');
        expect(result.string).to.equal('T<span class="highlight">e</span>st');
    });

    it('escapes html', function () {
        let result = highlightedText(['<script>alert("oops")</script>', 'oops']);
        expect(result).to.be.an('object');
        expect(result.string).to.equal('&lt;script&gt;alert(&quot;<span class="highlight">oops</span>&quot;)&lt;/script&gt;');
    });
});
