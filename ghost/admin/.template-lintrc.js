module.exports = {
    extends: "recommended",

    rules: {
        'no-forbidden-elements': ['meta', 'html', 'script'],
        'no-implicit-this': {allow: ['now', 'site-icon-style']},
        'no-inline-styles': false
    }
};
