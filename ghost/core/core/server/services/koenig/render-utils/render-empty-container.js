/*
 * Renders an empty container element
 * In the returned object, `type: 'inner'` is picked up by the `@tryghost/kg-lexical-html-renderer` package
 * to render the inner content of the container element (in this case, nothing)
 *
 * @see @tryghost/kg-lexical-html-renderer package
 * @see https://github.com/TryGhost/Koenig/blob/e14c008e176f7a1036fe3f3deb924ed69a69191f/packages/kg-lexical-html-renderer/lib/convert-to-html-string.js#L29
 */
function renderEmptyContainer(document) {
    const emptyContainer = document.createElement('span');
    return {element: emptyContainer, type: 'inner'};
}

module.exports = {
    renderEmptyContainer
};
