// Deliberately no 'use strict': this stands in for Ghost's production .js files
// and its CommonJS dependencies, where a write to a frozen object is dropped
// without an error. The read-only guard has to catch those.
module.exports.isSloppy = function isSloppy() {
  return (function () {
    return this;
  })() !== undefined;
};

module.exports.write = function write(target, key, value) {
  target[key] = value;
};

module.exports.remove = function remove(target, key) {
  delete target[key];
};
