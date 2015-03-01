/**
 * Creates a test suite function that uses permutations of the setup script
 * (made via `generator`).
 *
 *     gen = function(version) { return function() { ... } };
 *     mysuite = multisuite(['a', 'b'], gen);
 *
 *     mysuite('event tests', function() {
 *       ....
 *     });
 */

module.exports = function(variants, generator) {
  return function(name, fn) {
    variants.forEach(function(variant) {

      var subname = name;
      if (variants.length > 1) subname = variant.toString() + " " + subname;

      describe(subname, function() {
        var arr = variant.constructor === Array ? variant : [variant];
        before(generator.apply(this, arr));
        fn.apply(this);
      });

    });
  };
};
