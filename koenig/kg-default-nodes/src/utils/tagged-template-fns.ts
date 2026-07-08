const oneline = function (strings: TemplateStringsArray | string, ...values: unknown[]) {
    // Handle case where a plain string is passed
    if (typeof strings === 'string') {
        return strings.replace(/\n\s+/g, '').trim();
    }

    // Handle tagged template literal case
    const result = strings.reduce((acc: string, str: string, i: number) => {
        return acc + str + (values[i] ?? '');
    }, '');
    // Remove newline+indentation patterns while preserving intentional whitespace
    return result.replace(/\n\s+/g, '').trim();
};

// Using `html` as a synonym for `oneline` in order to get syntax highlighting in editors
const html = oneline;

export {oneline, html};
