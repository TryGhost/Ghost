const {$getRoot} = require('lexical');
const {$isKoenigCard} = require('@tryghost/kg-default-nodes');

function getDynamicDataNodes(editorState) {
    let dynamicNodes = [];

    editorState.read(() => {
        const root = $getRoot();
        const nodes = root.getChildren();

        nodes.forEach((node) => {
            if ($isKoenigCard(node) && node.hasDynamicData?.()) {
                dynamicNodes.push(node);
            }
        });
    });

    return dynamicNodes;
}

module.exports = {
    getDynamicDataNodes
};