/**
 * Converts a camelCase string to kebab-case
 */
function toKebabCase(str: string) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Formats a CSS value, adding units where necessary
 */
function formatValue(key: string, value: unknown) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    // Properties that should get px units for numeric values
    const needsPx = /^(width|height|top|right|bottom|left|margin|padding|fontSize|borderRadius|marginTop|marginRight|marginBottom|marginLeft|paddingTop|paddingRight|paddingBottom|paddingLeft|borderTopWidth|borderRightWidth|borderBottomWidth|borderLeftWidth)$/;

    // Properties that should never get px units
    const noPx = /^(lineHeight|opacity|zIndex|flexGrow|flexShrink|order)$/;

    if (typeof value === 'number') {
        if (needsPx.test(key)) {
            return `${value}px`;
        }
        if (!noPx.test(key)) {
            return `${value}px`;
        }
    }

    return String(value);
}

/**
 * Parses a CSS string into an object of style properties
 */
function parseCssString(cssString: string) {
    if (typeof cssString !== 'string') {
        return {};
    }

    const styles: Record<string, string> = {};
    const declarations = cssString.split(';').filter(Boolean);

    declarations.forEach((declaration) => {
        const [property, value] = declaration.split(':').map(part => part.trim());
        if (property && value) {
            // Convert kebab-case to camelCase for consistency
            const camelCaseProperty = property.replace(/-([a-z])/g, g => g[1].toUpperCase());
            styles[camelCaseProperty] = value;
        }
    });

    return styles;
}

export type StylexArg = Record<string, unknown> | string | false | null | undefined;

/**
 * Combines multiple style objects and CSS strings into a single CSS string
 */
export function stylex(...styles: StylexArg[]) {
    const mergedStyles: Record<string, unknown> = {};

    // Process each style argument
    styles.forEach((style) => {
        if (!style) {
            return;
        }

        if (typeof style === 'string') {
            // Handle CSS strings
            const parsedStyles = parseCssString(style);
            Object.assign(mergedStyles, parsedStyles);
        } else if (typeof style === 'object') {
            // Handle style objects
            Object.entries(style).forEach(([key, value]) => {
                if (value !== null && value !== false) {
                    mergedStyles[key] = value;
                }
            });
        }
    });

    // Convert to CSS string with spaces after semicolons
    const styleString = Object.entries(mergedStyles)
        .map(([key, value]) => {
            const formattedValue = formatValue(key, value);
            return formattedValue ? `${toKebabCase(key)}: ${formattedValue}` : '';
        })
        .filter(Boolean)
        .join('; ');

    return styleString ? styleString + ';' : '';
}

export default stylex;
