// jscs: disable
/* global XRegExp */

export default function (s) {
    let nonANumLetters = new XRegExp("[^\\s\\d\\p{L}]", 'g'); // all non-alphanumeric letters regexp

    s = s.replace(/<(.|\n)*?>/g, ' '); // strip tags
    s = s.replace(nonANumLetters, ''); // ignore non-alphanumeric letters
    s = s.replace(/(^\s*)|(\s*$)/gi, ''); // exclude starting and ending white-space
    s = s.replace(/\n /gi, ' '); // convert newlines to spaces
    s = s.replace(/\n+/gi, ' ');
    s = s.replace(/[ ]{2,}/gi, ' '); // convert 2 or more spaces to 1

    return s.split(' ').length;
}
