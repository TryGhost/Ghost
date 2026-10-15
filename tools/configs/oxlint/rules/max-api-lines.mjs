// Migrated from eslint-plugin-ghost. Preserve its matching behavior.

const DEFAULT_MAX_LINES = 11;

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

/**
 * Given a list of comment nodes, return a map with numeric keys (source code line numbers) and comment token values.
 * @param {Array} comments An array of comment nodes.
 * @returns {Map.<string,Node>} A map with numeric keys (source code line numbers) and comment token values.
 */
function getCommentLineNumbers(comments) {
  const map = new Map();

  comments.forEach((comment) => {
    for (let i = comment.loc.start.line; i <= comment.loc.end.line; i++) {
      map.set(i, comment);
    }
  });
  return map;
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

export default {
  meta: {
    docs: {
      description: 'Enforce light API endpoint files',
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
      exceed: '{{name}} is too long ({{lineCount}}). Maximum allowed is {{maxLines}}.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const filename = context.filename;
    const lines = sourceCode.lines;

    const option = context.options[0];
    let maxLines = DEFAULT_MAX_LINES;

    // Only run this on api files
    if (!filename.includes('/api/')) {
      return {};
    }

    if (typeof option === 'object') {
      maxLines = typeof option.max === 'number' ? option.max : DEFAULT_MAX_LINES;
    } else if (typeof option === 'number') {
      maxLines = option;
    }

    const commentLineNumbers = getCommentLineNumbers(sourceCode.getAllComments());

    //--------------------------------------------------------------------------
    // Helpers
    //--------------------------------------------------------------------------

    /**
     * Tells if a comment encompasses the entire line.
     * @param {string} line The source line with a trailing comment
     * @param {number} lineNumber The one-indexed line number this is on
     * @param {ASTNode} comment The comment to remove
     * @returns {boolean} If the comment covers the entire line
     */
    function isFullLineComment(line, lineNumber, comment) {
      const start = comment.loc.start;
      const end = comment.loc.end;
      const isFirstTokenOnLine = start.line === lineNumber && !line.slice(0, start.column).trim();
      const isLastTokenOnLine = end.line === lineNumber && !line.slice(end.column).trim();

      return (
        comment &&
        (start.line < lineNumber || isFirstTokenOnLine) &&
        (end.line > lineNumber || isLastTokenOnLine)
      );
    }

    /**
     * Count the lines in the function
     * @param {ASTNode} funcNode Function AST node
     * @returns {void}
     * @private
     */
    function processFunction(node) {
      let lineCount = 0;

      for (let i = node.loc.start.line - 1; i < node.loc.end.line; ++i) {
        const line = lines[i];

        // Do skip comments
        if (
          commentLineNumbers.has(i + 1) &&
          isFullLineComment(line, i + 1, commentLineNumbers.get(i + 1))
        ) {
          continue;
        }

        // Do skip blanklines
        if (line.match(/^\s*$/u)) {
          continue;
        }

        lineCount += 1;
      }

      if (lineCount > maxLines) {
        const name = getNameForReport(filename, node);

        context.report({
          node,
          messageId: 'exceed',
          data: { name, lineCount, maxLines },
        });
      }
    }

    // Public API
    return {
      FunctionExpression(funcNode) {
        // if this is a query function - e.g. the main part of an API
        if (funcNode.parent && funcNode.parent.key && funcNode.parent.key.name === 'query') {
          return processFunction(funcNode);
        }

        return null;
      },
    };
  },
};
