export function oneline(strings, ...values) {
    const result = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] || '');
    }, '');
    // Remove newline+indentation patterns while preserving intentional whitespace
    return result.replace(/\n\s+/g, '').trim();
}
