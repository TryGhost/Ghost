const nodeRenderers = require('../../../../../../core/server/services/koenig/node-renderers');

module.exports = function buildCallRenderer(dom) {
    return function callRenderer(nodeType, data, options = {}) {
        const renderer = nodeRenderers[nodeType];
        if (!renderer) {
            throw new Error(`Renderer for node type ${nodeType} not found`);
        }

        // duplicate data to __x properties to simulate what's available in real node instances
        data = {
            ...data,
            ...Object.fromEntries(Object.entries(data).map(([key, value]) => [`__${key}`, value]))
        };

        // add other default node properties and methods
        data = {
            isEmpty: () => false,
            getDataset: () => data,
            ...data
        };

        // add dom to options if it's not already present
        if (!options.dom) {
            options.dom = dom;
        }

        // default options
        options = {
            ...options,
            siteUrl: 'https://test.com/',
            postUrl: 'https://test.com/post/',
            imageOptimization: {
                contentImageSizes: {
                    w600: {width: 600},
                    w1000: {width: 1000},
                    w1600: {width: 1600},
                    w2400: {width: 2400}
                }
            },
            canTransformImage: () => true
        };

        let result;
        if (typeof renderer === 'object') {
            // support for versioned node renderers
            if (!data.version) {
                throw new Error('version data property is required for versioned node renderers');
            }

            result = renderer[data.version](data, options);
        } else {
            result = renderer(data, options);
        }

        let html;
        if (result.type === 'inner') {
            html = result.element.innerHTML;
        } else if (result.type === 'value') {
            html = result.element.value;
        } else {
            html = result.element.outerHTML;
        }

        return {
            element: result.element,
            type: result.type,
            html
        };
    };
};