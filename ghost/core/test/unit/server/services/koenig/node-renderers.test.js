const assert = require('assert/strict');
const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');
const nodeRenderers = require('../../../../../core/server/services/koenig/node-renderers');

// some nodes are not cards or will never be emailed so we exclude them from tests
const excludedNodes = [
    // deprecated nodes that are waiting to be removed
    'collection',
    // non-card nodes
    'paragraph',
    'aside',
    'extended-text',
    'extended-quote',
    'extended-heading',
    'tk',
    'at-link',
    'at-link-search',
    'zwnj'
];

// remove nodes with the above type or that don't have a getType method
const FILTERED_DEFAULT_NODES = DEFAULT_NODES.filter((node) => {
    try {
        return !excludedNodes.includes(node.getType());
    } catch (error) {
        return false;
    }
});

describe('services/koenig/node-renderers', function () {
    it('should export a renderer for each default node type', function () {
        for (const node of FILTERED_DEFAULT_NODES) {
            assert.ok(nodeRenderers[node.getType()], `Custom node renderer for ${node.getType()} not found`);
        }
    });
});