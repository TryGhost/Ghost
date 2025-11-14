/**
 * This Prettier config has been adapted to match the formatting imposed by
 * ESLint. There might still be some minor formatting differences, so ensure
 * you're running Prettier first and then ESLint after. 
 *
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
module.exports = {
    trailingComma: 'none',
    tabWidth: 4,
    semi: true,
    singleQuote: true,
    printWidth: 120,
    bracketSpacing: false,
    arrowParens: 'avoid'
};
