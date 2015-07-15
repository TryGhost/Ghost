var VENDOR_PREFIX_PATTERN = /$\-moz\-|\-ms\-|\-o\-|\-webkit\-/;

function prefixesIn(tokens) {
  var prefixes = [];

  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];

    for (var j = 0, m = token.value.length; j < m; j++) {
      var match = VENDOR_PREFIX_PATTERN.exec(token.value[j][0]);

      if (match && prefixes.indexOf(match[0]) == -1)
        prefixes.push(match[0]);
    }
  }

  return prefixes;
}

function same(left, right) {
  return prefixesIn(left).sort().join(',') == prefixesIn(right).sort().join(',');
}

module.exports = {
  same: same
};
