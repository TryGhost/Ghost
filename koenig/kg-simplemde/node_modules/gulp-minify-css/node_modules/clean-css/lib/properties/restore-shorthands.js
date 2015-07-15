var compactable = require('./compactable');

function restoreShorthands(properties) {
  for (var i = properties.length - 1; i >= 0; i--) {
    var property = properties[i];
    var descriptor = compactable[property.name];

    if (descriptor && descriptor.shorthand && property.dirty && !property.unused) {
      var restored = descriptor.restore(property, compactable);
      property.value = restored;

      if (!('all' in property))
        continue;

      var current = property.all[property.position];
      current.splice(1, current.length - 1);

      Array.prototype.push.apply(current, restored);
    }
  }
}

module.exports = restoreShorthands;
