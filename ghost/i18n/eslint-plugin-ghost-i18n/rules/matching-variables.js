module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Ensure translation keys and values have matching variables',
            category: 'i18n',
            recommended: true
        },
        schema: []
    },
    create(context) {
        function extractVariables(str) {
            if (!str) return new Set();
            const regex = /\{([^}]+)\}/g;
            const variables = new Set();
            let match;
            while ((match = regex.exec(str)) !== null) {
                variables.add(match[1]);
            }
            return variables;
        }

        function checkTranslationPair(key, value, node) {
            // Skip checking if value is an empty string
            if (value === '') {
                return;
            }

            if (typeof key !== 'string') {
                return;
            }

            const keyVars = extractVariables(key);
            const valueVars = extractVariables(value);

            // Check for variables in key but not in value
            for (const keyVar of keyVars) {
                if (!valueVars.has(keyVar)) {
                    context.report({
                        node,
                        message: `Variable "${keyVar}" is used in the key but missing in the translation value`
                    });
                }
            }

            // Check for variables in value but not in key
            for (const valueVar of valueVars) {
                if (!keyVars.has(valueVar)) {
                    context.report({
                        node,
                        message: `Variable "${valueVar}" is used in the translation value but missing in the key`
                    });
                }
            }
        }

        return {
            Property(node) {
                if (node.key && node.value) {
                    const key = node.key.value;
                    const value = node.value.value;
                    checkTranslationPair(key, value, node);
                }
            },
            JSONProperty(node) {
                if (node.key && node.value) {
                    const key = node.key.value;
                    const value = node.value.value;
                    checkTranslationPair(key, value, node);
                }
            }
        };
    }
}; 