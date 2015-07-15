function removeUnused(properties) {
  for (var i = properties.length - 1; i >= 0; i--) {
    if (properties[i].unused)
      properties[i].all.splice(i, 1);
  }
}

module.exports = removeUnused;
