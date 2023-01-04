module.exports = {
    extends: "recommended",

    rules: {
        'no-forbidden-elements': ['meta', 'html', 'script'],
        'no-implicit-this': {allow: ['noop', 'now', 'site-icon-style', 'accent-color-background']},
        'no-inline-styles': false,
        'no-duplicate-landmark-elements': false,
        'no-pointer-down-event-binding': false,
        'no-triple-curlies': false
    }
};
