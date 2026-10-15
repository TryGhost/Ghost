// Migrated from eslint-plugin-ghost. Preserve its matching behavior.

const DEFAULT_COMPLEXITY = 3;

/**
 * This function allows some flexibility for us to move the api folder and add in e.g. an endpoints folder
 * It should hopefully still get this right!
 *
 * @param {string} filename
 * @returns
 */
function getAPIVersionAndEndpointName(filename) {
  let nameParts = filename.split('/api/');
  let usefulPath = nameParts[1].split('/');
  let version;
  let endpoint;

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

function getNameForReport(filename, funcNode) {
  let api = getAPIVersionAndEndpointName(filename);
  let method = funcNode.parent.parent.parent.key.name;

  return `${api.version} API ${api.endpoint}.${method}() query method`;
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

export default {
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
    let THRESHOLD = DEFAULT_COMPLEXITY;

    if (
      typeof option === 'object' &&
      (Object.prototype.hasOwnProperty.call(option, 'maximum') ||
        Object.prototype.hasOwnProperty.call(option, 'max'))
    ) {
      THRESHOLD = option.maximum || option.max;
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
    const fns = [];

    /**
     * When parsing a new function, store it in our function stack
     * @returns {void}
     * @private
     */
    function startFunction(node) {
      // if this is a query function - e.g. the main part of an API
      if (node.parent && node.parent.key && node.parent.key.name === 'query') {
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
    function endFunction(node) {
      // if this is a query function - e.g. the main part of an API
      if (node.parent && node.parent.key && node.parent.key.name === 'query') {
        const complexity = fns.pop();

        if (complexity > THRESHOLD) {
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
        fns[fns.length - 1] += 1;
      }
    }

    /**
     * Increase the switch complexity in context
     * @param {ASTNode} node node to evaluate
     * @returns {void}
     * @private
     */
    function increaseSwitchComplexity(node) {
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
