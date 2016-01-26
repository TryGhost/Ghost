// jscs: disable
/* global XRegExp */

export default function (s) {
    let charCJK = new XRegExp("[\\p{Katakana}\\p{Hiragana}\\p{Han}\\p{Hangul}]", 'g');
    let cjk = s.match(charCJK);
    return cjk === null ? 0 : cjk.length;
}
