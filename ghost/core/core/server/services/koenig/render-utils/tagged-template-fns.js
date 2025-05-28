function _oneline(string) {
    return string
        .replace(/\n\s+/g, ' ') // Replace newlines + whitespace with single space
        .replace(/>\s+</g, '><') // Remove spaces between closing and opening tags
        .replace(/\s+>/g, '>') // Remove unnecessary whitespace inside tag
        .trim();
}

const oneline = function (strings, ...values) {
    // Handle case where a plain string is passed
    if (typeof strings === 'string') {
        return _oneline(strings);
    }

    // Handle tagged template literal case
    const result = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] || '');
    }, '');
    // Remove newline+indentation patterns while preserving intentional whitespace
    return _oneline(result);
};

// Using `html` as a synonym for `oneline` in order to get syntax highlighting in editors
const html = oneline;

module.exports = {
    oneline,
    html
};
