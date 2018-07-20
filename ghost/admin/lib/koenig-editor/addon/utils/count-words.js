/**
 * Word count Utility
 * @param {string} html
 * @returns {integer} word count
 * @description Takes a string and returns the number of words
 * This code is taken from https://github.com/sparksuite/simplemde-markdown-editor/blob/6abda7ab68cc20f4aca870eb243747951b90ab04/src/js/simplemde.js#L1054-L1067
 * with extra diacritics character matching. It's the same code as used in
 * Ghost's {{reading_time}} helper
 **/
export default function countWords(text = '') {
    // protect against Handlebars.SafeString
    if (text.hasOwnProperty('string')) {
        text = text.string;
    }

    let pattern = /[a-zA-ZÀ-ÿ0-9_\u0392-\u03c9\u0410-\u04F9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
    let match = text.match(pattern);
    let count = 0;

    if (match === null) {
        return count;
    }

    for (var i = 0; i < match.length; i += 1) {
        if (match[i].charCodeAt(0) >= 0x4E00) {
            count += match[i].length;
        } else {
            count += 1;
        }
    }

    return count;
}

export function countImages(html = '') {
    // protect against Handlebars.SafeString
    if (html.hasOwnProperty('string')) {
        html = html.string;
    }

    return (html.match(/<img(.|\n)*?>/g) || []).length;
}

export function stripTags(html = '') {
    // protect against Handlebars.SafeString
    if (html.hasOwnProperty('string')) {
        html = html.string;
    }

    return html.replace(/<(.|\n)*?>/g, ' ');
}
