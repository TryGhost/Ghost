const baseSettings = {
    wordwrap: false,
    preserveNewlines: true,

    // equiv returnDomByDefault: true,
    baseElements: {returnDomByDefault: true},
    selectors: [
        // Ignore images, equiv ignoreImage: true
        {selector: 'img', format: 'skip'},

        // disable uppercase headings, equiv uppercaseHeadings: false
        {selector: 'h1', options: {uppercase: false}},
        {selector: 'h2', options: {uppercase: false}},
        {selector: 'h3', options: {uppercase: false}},
        {selector: 'h4', options: {uppercase: false}},
        {selector: 'h5', options: {uppercase: false}},
        {selector: 'h6', options: {uppercase: false}},
        {selector: 'table', options: {uppercaseHeaderCells: false}},

        // equiv hideLinkHrefIfSameAsText: true
        {selector: 'a', options: {hideLinkHrefIfSameAsText: true}},

        // Backwards compatibility with html-to-text 5.1.1
        {selector: 'div', format: 'inline'}
    ]
};

let excerptConverter;
let emailConverter;

const loadConverters = () => {
    if (excerptConverter && emailConverter) {
        return;
    }

    const {compile} = require('html-to-text');

    excerptConverter = compile(baseSettings);
    emailConverter = compile(baseSettings);
};

module.exports.excerpt = (html) => {
    loadConverters();

    return excerptConverter(html);
};

module.exports.email = (html) => {
    loadConverters();

    return emailConverter(html);
};
