const {$isImageNode} = require('../../nodes/ImageNode');

module.exports = {
    export(node) {
        if (!$isImageNode(node)) {
            return null;
        }
        let figureClasses = 'kg-card kg-image-card';
        if (node.cardWidth !== 'regular') {
            figureClasses += ` kg-width-${node.cardWidth}`;
        }

        return (`
        <figure class="${figureClasses}">
            <img src="${node.src}" alt="${node.altText}" />
                <figcaption>
                ${node.caption}
                </figcaption>
        </figure>
        `);
    }
};
