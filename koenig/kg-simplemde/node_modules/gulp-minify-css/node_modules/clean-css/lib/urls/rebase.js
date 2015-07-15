var path = require('path');

var rewriteUrls = require('./rewrite');

function rebaseUrls(data, context) {
  var rebaseOpts = {
    absolute: context.options.explicitRoot,
    relative: !context.options.explicitRoot && context.options.explicitTarget,
    fromBase: context.options.relativeTo
  };

  if (!rebaseOpts.absolute && !rebaseOpts.relative)
    return data;

  if (rebaseOpts.absolute && context.options.explicitTarget)
    context.warnings.push('Both \'root\' and output file given so rebasing URLs as absolute paths');

  if (rebaseOpts.absolute)
    rebaseOpts.toBase = path.resolve(context.options.root);

  if (rebaseOpts.relative)
    rebaseOpts.toBase = path.resolve(context.options.target);

  if (!rebaseOpts.fromBase || !rebaseOpts.toBase)
    return data;

  return rewriteUrls(data, rebaseOpts, context);
}

module.exports = rebaseUrls;
