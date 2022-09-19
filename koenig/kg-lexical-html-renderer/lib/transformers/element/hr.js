const {$isHorizontalRuleNode} = require('../../nodes/HorizontalRuleNode');

module.exports = {
    export(node) {
        if (!$isHorizontalRuleNode(node)) {
            return null;
        }

        return `<hr>`;
    }
};
