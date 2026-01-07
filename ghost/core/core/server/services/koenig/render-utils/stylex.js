/**
 * Converts a camelCase string to kebab-case
 * @param {string} str - The string to convert
 * @returns {string} The kebab-case string
 */
function toKebabCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Formats a CSS value, adding units where necessary
 * @param {string} key - The CSS property name
 * @param {*} value - The value to format
 * @returns {string} The formatted CSS value
 */
function formatValue(key, value) {
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
 * @param {string} cssString - The CSS string to parse
 * @returns {Object} Object containing style properties
 */
function parseCssString(cssString) {
    if (typeof cssString !== 'string') {
        return {};
    }

    const styles = {};
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

/**
 * Combines multiple style objects and CSS strings into a single CSS string
 * @param {...(Object|string)} styles - Style objects or CSS strings to combine
 * @returns {string} Combined CSS string
 */
function stylex(...styles) {
    const mergedStyles = {};

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

module.exports = stylex;
