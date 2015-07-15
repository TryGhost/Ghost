function wrapAll(properties) {
  var wrapped = [];

  for (var i = properties.length - 1; i >= 0; i--) {
    if (typeof properties[i][0] == 'string')
      continue;

    var single = wrapSingle(properties[i]);
    single.all = properties;
    single.position = i;
    wrapped.unshift(single);
  }

  return wrapped;
}

function isMultiplex(property) {
  for (var i = 1, l = property.length; i < l; i++) {
    if (property[i][0] == ',' || property[i][0] == '/')
      return true;
  }

  return false;
}

function wrapSingle(property) {
  return {
    components: [],
    dirty: false,
    hack: property[0][2],
    important: property[0][1],
    name: property[0][0],
    multiplex: property.length > 2 ? isMultiplex(property) : false,
    position: 0,
    shorthand: false,
    unused: property.length < 2,
    value: property.slice(1)
  };
}

module.exports = {
  all: wrapAll,
  single: wrapSingle
};
