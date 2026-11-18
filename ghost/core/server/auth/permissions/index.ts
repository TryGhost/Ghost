// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

import canThis from './can-this';
import parseContext from './parse-context';

// A plain object, so tests can stub canThis on it
// @ts-expect-error ignore erasableSyntaxOnly here: js callers require() this
// module and read canThis/parseContext straight off module.exports.
export = {
  canThis,
  parseContext,
};
