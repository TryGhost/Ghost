var shallowClone = require('./clone').shallow;

var MULTIPLEX_SEPARATOR = ',';

function everyCombination(fn, left, right, validator) {
  var _left = shallowClone(left);
  var _right = shallowClone(right);

  for (var i = 0, l = left.value.length; i < l; i++) {
    for (var j = 0, m = right.value.length; j < m; j++) {
      if (left.value[i][0] == MULTIPLEX_SEPARATOR || right.value[j][0] == MULTIPLEX_SEPARATOR)
        continue;

      _left.value = [left.value[i]];
      _right.value = [right.value[j]];
      if (!fn(_left, _right, validator))
        return false;
    }
  }

  return true;
}

module.exports = everyCombination;
