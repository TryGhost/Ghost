// # Strip Tags Helper
// Usage: `{{strip_tags html}}` or `{{#strip_tags}}...{{/strip_tags}}`
//
// Removes all HTML tags from the given string (inline) or from the rendered block content (block form).
// Each removed tag becomes a single space, HTML entities are decoded, whitespace runs are collapsed and the
// result is trimmed. The output is escaped for the HTML context in both forms; use `{{{strip_tags html}}}`
// for the raw text.

const cheerio = require('cheerio/slim');
const { SafeString, escapeExpression } = require('../services/handlebars');

const IGNORED_ELEMENTS = new Set(['script', 'style', 'template']);

function collectText(nodes, parts) {
  for (const node of nodes) {
    if (node.type === 'text') {
      parts.push(node.data);
    } else if (node.type === 'tag' && !IGNORED_ELEMENTS.has(node.name)) {
      collectText(node.children, parts);
    }
  }
}

function stripTags(input) {
  if (input instanceof SafeString) {
    input = input.toString();
  }

  if (input === undefined || input === null) {
    return '';
  }

  if (typeof input !== 'string') {
    if (typeof input !== 'number' && typeof input !== 'boolean') {
      return '';
    }
    input = String(input);
  }

  const $ = cheerio.load(input, null, false);
  const parts = [];
  collectText($.root()[0].children, parts);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

module.exports = function stripTagsHelper(...args) {
  const options = args.pop();

  // Block form: Handlebars does not escape a block helper's output, so escape it here
  // to keep the result safe by default, matching the inline form.
  if (options && typeof options.fn === 'function') {
    return new SafeString(escapeExpression(stripTags(options.fn(this))));
  }

  return stripTags(args[0]);
};
