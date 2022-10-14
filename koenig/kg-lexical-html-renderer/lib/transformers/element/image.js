const {$isImageNode} = require('../../nodes/ImageNode');

module.exports = {
    export(node) {
        if (!$isImageNode(node)) {
            return null;
        }
        return (`
        <figure>
            <img src="${node.src}" alt="${node.altText}" /> 
                <figcaption>
                ${node.caption}
                </figcaption>
        </figure>
        `);
    }
};
