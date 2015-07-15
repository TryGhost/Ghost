function removeWhitespace(match, value) {
  return '[' + value.replace(/ /g, '') + ']';
}

function selectorSorter(s1, s2) {
  return s1[0] > s2[0] ? 1 : -1;
}

var CleanUp = {
  selectors: function (selectors, removeUnsupported, adjacentSpace) {
    var list = [];
    var repeated = [];

    for (var i = 0, l = selectors.length; i < l; i++) {
      var selector = selectors[i];
      var reduced = selector[0]
        .replace(/\s+/g, ' ')
        .replace(/ ?, ?/g, ',')
        .replace(/\s*([>\+\~])\s*/g, '$1')
        .trim();

      if (adjacentSpace && reduced.indexOf('nav') > 0)
        reduced = reduced.replace(/\+nav(\S|$)/, '+ nav$1');

      if (removeUnsupported && (reduced.indexOf('*+html ') != -1 || reduced.indexOf('*:first-child+html ') != -1))
        continue;

      if (reduced.indexOf('*') > -1) {
        reduced = reduced
          .replace(/\*([:#\.\[])/g, '$1')
          .replace(/^(\:first\-child)?\+html/, '*$1+html');
      }

      if (reduced.indexOf('[') > -1)
        reduced = reduced.replace(/\[([^\]]+)\]/g, removeWhitespace);

      if (repeated.indexOf(reduced) == -1) {
        selector[0] = reduced;
        repeated.push(reduced);
        list.push(selector);
      }
    }

    return list.sort(selectorSorter);
  },

  selectorDuplicates: function (selectors) {
    var list = [];
    var repeated = [];

    for (var i = 0, l = selectors.length; i < l; i++) {
      var selector = selectors[i];

      if (repeated.indexOf(selector[0]) == -1) {
        repeated.push(selector[0]);
        list.push(selector);
      }
    }

    return list.sort(selectorSorter);
  },

  block: function (values, spaceAfterClosingBrace) {
    values[0] = values[0]
      .replace(/\s+/g, ' ')
      .replace(/(,|:|\() /g, '$1')
      .replace(/ \)/g, ')');

    if (!spaceAfterClosingBrace)
      values[0] = values[0].replace(/\) /g, ')');
  },

  atRule: function (values) {
    values[0] = values[0]
      .replace(/\s+/g, ' ')
      .trim();
  }
};

module.exports = CleanUp;
