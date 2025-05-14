const oneline = function (strings, ...values) {
    const result = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] || '');
    }, '');
    // Remove newline+indentation patterns while preserving intentional whitespace
    return result.replace(/\n\s+/g, '').trim();
};

// Using `html` as a synonym for `oneline` in order to get syntax highlighting in editors
const html = oneline;

export {oneline, html};