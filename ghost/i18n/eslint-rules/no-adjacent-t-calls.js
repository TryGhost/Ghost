/**
 * ESLint rule: no-adjacent-t-calls
 *
 * Detects adjacent t() calls in JSX that likely form a single sentence.
 * Split sentences prevent translators from reordering words for different
 * languages. Use @doist/react-interpolate with a single t() call instead.
 *
 * Bad:  {t('Could not sign in.')} <a>{t('Click here')}</a>
 * Good: <Interpolate string={t('Could not sign in. <a>Click here</a>')} mapping={{a: <a />}} />
 */

function isTCall(node) {
    return (
        node.type === 'JSXExpressionContainer' &&
        node.expression.type === 'CallExpression' &&
        node.expression.callee.type === 'Identifier' &&
        node.expression.callee.name === 't'
    );
}

function containsTCall(node) {
    if (!node) {
        return false;
    }
    if (isTCall(node)) {
        return true;
    }
    // Check JSX elements that have t() in their children
    if (node.type === 'JSXElement') {
        return node.children && node.children.some(child => containsTCall(child));
    }
    return false;
}

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description:
                'Disallow adjacent t() calls in JSX that form a single sentence. Use @doist/react-interpolate instead.'
        },
        messages: {
            adjacentTCalls:
                'Adjacent t() calls detected — this splits a sentence across multiple translation keys, preventing translators from reordering words. Use @doist/react-interpolate with a single t() call instead.'
        }
    },
    create(context) {
        return {
            JSXElement(node) {
                const children = node.children;
                if (!children || children.length < 2) {
                    return;
                }

                // Look for patterns where two t() calls (or elements wrapping t() calls)
                // are siblings, possibly separated only by whitespace, <br/>, or inline elements
                const significantChildren = children.filter((child) => {
                    // Skip whitespace-only text
                    if (child.type === 'JSXText' && child.value.trim() === '') {
                        return false;
                    }
                    // Skip <br /> elements
                    if (
                        child.type === 'JSXElement' &&
                        child.openingElement.name.type === 'JSXIdentifier' &&
                        child.openingElement.name.name === 'br'
                    ) {
                        return false;
                    }
                    return true;
                });

                for (let i = 0; i < significantChildren.length - 1; i++) {
                    const current = significantChildren[i];
                    const next = significantChildren[i + 1];

                    const currentHasT = containsTCall(current);
                    const nextHasT = containsTCall(next);

                    if (currentHasT && nextHasT) {
                        context.report({
                            node: next,
                            messageId: 'adjacentTCalls'
                        });
                    }
                }
            }
        };
    }
};
