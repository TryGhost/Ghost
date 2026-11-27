import type { CreateRule, ESTree } from '@oxlint/plugins';

// Migrated from eslint-plugin-ghost. Preserve its matching behavior.

const DEFAULT_COMPLEXITY = 3;

/**
 * This function allows some flexibility for us to move the api folder and add in e.g. an endpoints folder
 * It should hopefully still get this right!
 *
 * @param {string} filename
 * @returns
 */
function getAPIVersionAndEndpointName(filename: string) {
  let nameParts = filename.split('/api/');
  let usefulPath = (nameParts[1] ?? '').split('/');
  let version: string | undefined;
  let endpoint: string | undefined;

  usefulPath.forEach((pathPart) => {
    if (pathPart.startsWith('v') || pathPart === 'canary') {
      version = pathPart;
    }

    if (pathPart.endsWith('.js')) {
      endpoint = pathPart.replace('.js', '');
    }
  });

  return { version, endpoint };
}

function getNameForReport(filename: string, funcNode: ESTree.Node) {
  let api = getAPIVersionAndEndpointName(filename);
  const methodNode = funcNode.parent?.parent?.parent;
  const method =
    methodNode && 'key' in methodNode && methodNode.key.type === 'Identifier'
      ? methodNode.key.name
      : undefined;

  return `${api.version} API ${api.endpoint}.${method}() query method`;
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

export const maxApiComplexity: CreateRule = {
  meta: {
    docs: {
      description: 'Enforce simple API endpoint methods',
      category: 'Ghost',
      recommended: false,
    },
    schema: [
      {
        oneOf: [
          {
            type: 'integer',
            minimum: 0,
          },
          {
            type: 'object',
            properties: {
              maximum: {
                type: 'integer',
                minimum: 0,
              },
              max: {
                type: 'integer',
                minimum: 0,
              },
            },
            additionalProperties: false,
          },
        ],
      },
    ],
    messages: {
      complex: '{{name}} is too complex ({{complexity}}). Maximum allowed is {{max}}.',
    },
  },

  create(context) {
    const option = context.options[0];
    const filename = context.filename;
    let THRESHOLD: number | undefined = DEFAULT_COMPLEXITY;

    if (
      typeof option === 'object' &&
      option !== null &&
      !Array.isArray(option) &&
      (Object.prototype.hasOwnProperty.call(option, 'maximum') ||
        Object.prototype.hasOwnProperty.call(option, 'max'))
    ) {
      const maximum = option.maximum || option.max;
      THRESHOLD = typeof maximum === 'number' ? maximum : undefined;
    } else if (typeof option === 'number') {
      THRESHOLD = option;
    }

    // Only run this on api files
    if (!filename.includes('/api/')) {
      return {};
    }

    //--------------------------------------------------------------------------
    // Helpers
    //--------------------------------------------------------------------------

    // Using a stack to store complexity (handling nested functions)
    const fns: number[] = [];

    /**
     * When parsing a new function, store it in our function stack
     * @returns {void}
     * @private
     */
    function startFunction(node: ESTree.Node) {
      // if this is a query function - e.g. the main part of an API
      if (
        node.parent &&
        'key' in node.parent &&
        node.parent.key.type === 'Identifier' &&
        node.parent.key.name === 'query'
      ) {
        fns.push(1);
      }

      return null;
    }

    /**
     * Evaluate the node at the end of function
     * @param {ASTNode} node node to evaluate
     * @returns {void}
     * @private
     */
    function endFunction(node: ESTree.Node) {
      // if this is a query function - e.g. the main part of an API
      if (
        node.parent &&
        'key' in node.parent &&
        node.parent.key.type === 'Identifier' &&
        node.parent.key.name === 'query'
      ) {
        const complexity = fns.pop();

        if (complexity !== undefined && THRESHOLD !== undefined && complexity > THRESHOLD) {
          const name = getNameForReport(filename, node);

          context.report({
            node,
            messageId: 'complex',
            data: { name, complexity, max: THRESHOLD },
          });
        }
      }
    }

    /**
     * Increase the complexity of the function in context
     * @returns {void}
     * @private
     */
    function increaseComplexity() {
      if (fns.length) {
        fns[fns.length - 1] = (fns[fns.length - 1] ?? 0) + 1;
      }
    }

    /**
     * Increase the switch complexity in context
     * @param {ASTNode} node node to evaluate
     * @returns {void}
     * @private
     */
    function increaseSwitchComplexity(node: ESTree.SwitchCase) {
      // Avoiding `default`
      if (node.test) {
        increaseComplexity();
      }
    }

    // Public API
    return {
      FunctionExpression: startFunction,
      'FunctionExpression:exit': endFunction,

      CatchClause: increaseComplexity,
      ConditionalExpression: increaseComplexity,
      LogicalExpression: increaseComplexity,
      ForStatement: increaseComplexity,
      ForInStatement: increaseComplexity,
      ForOfStatement: increaseComplexity,
      IfStatement: increaseComplexity,
      SwitchCase: increaseSwitchComplexity,
      WhileStatement: increaseComplexity,
      DoWhileStatement: increaseComplexity,

      AssignmentExpression(node) {
        let operator = node.operator;
        if (operator === '&&=' || operator === '||=' || operator === '??=') {
          increaseComplexity();
        }
      },
    };
  },
};
