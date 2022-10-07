import {countCharacters} from 'ghost-admin/helpers/gh-count-characters';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Helper: gh-count-characters', function () {
    let defaultStyle = 'color: rgb(69, 195, 46);';
    let errorStyle = 'color: rgb(240, 82, 48);';

    it('counts remaining chars', function () {
        let result = countCharacters(['test']);
        expect(result.string)
            .to.equal(`<span class="word-count" style="${defaultStyle}">196</span>`);
    });

    it('warns when nearing limit', function () {
        let result = countCharacters([Array(195 + 1).join('x')]);
        expect(result.string)
            .to.equal(`<span class="word-count" style="${errorStyle}">5</span>`);
    });

    it('indicates too many chars', function () {
        let result = countCharacters([Array(205 + 1).join('x')]);
        expect(result.string)
            .to.equal(`<span class="word-count" style="${errorStyle}">-5</span>`);
    });

    it('counts multibyte correctly', function () {
        let result = countCharacters(['💩']);
        expect(result.string)
            .to.equal(`<span class="word-count" style="${defaultStyle}">199</span>`);

        // emoji + modifier is still two chars
        result = countCharacters(['💃🏻']);
        expect(result.string)
            .to.equal(`<span class="word-count" style="${defaultStyle}">198</span>`);
    });
});
