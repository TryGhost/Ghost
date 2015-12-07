/* globals requirejs, require */
(function() {
define("ember-cli/test-loader",
  [],
  function() {
    "use strict";

    var moduleIncludeMatchers = [];
    var moduleExcludeMatchers = [];

    function addModuleIncludeMatcher(fn) {
      moduleIncludeMatchers.push(fn);
    };

    function addModuleExcludeMatcher(fn) {
      moduleExcludeMatchers.push(fn);
    };

    function checkMatchers(matchers, moduleName) {
      var matcher;

      for (var i = 0, l = matchers.length; i < l; i++) {
        matcher = matchers[i];

        if (matcher(moduleName)) {
          return true;
        }
      }

      return false;
    }

    function TestLoader() {
      this._didLogMissingUnsee = false;
    };

    TestLoader.prototype = {
      shouldLoadModule: function(moduleName) {
        return (moduleName.match(/[-_]test$/));
      },

      loadModules: function() {
        var moduleName;

        for (moduleName in requirejs.entries) {
          if (checkMatchers(moduleExcludeMatchers, moduleName)) {
            continue;
          }

          if (checkMatchers(moduleIncludeMatchers, moduleName) || this.shouldLoadModule(moduleName)) {
            this.require(moduleName);
            this.unsee(moduleName);
          }
        }
      }
    };

    TestLoader.prototype.require = function(moduleName) {
      try {
        require(moduleName);
      } catch(e) {
        this.moduleLoadFailure(moduleName, e);
      }
    };

   TestLoader.prototype.unsee = function(moduleName) {
     if (typeof require.unsee === 'function') {
       require.unsee(moduleName);
     } else if (!this._didLogMissingUnsee) {
      this._didLogMissingUnsee = true;
      if (typeof console !== 'undefined') {
        console.warn('unable to require.unsee, please upgrade loader.js to >= v3.3.0');
      }
     }
    };

    TestLoader.prototype.moduleLoadFailure = function(moduleName, error) {
      console.error('Error loading: ' + moduleName, error.stack);
    };

    TestLoader.load = function() {
      new TestLoader().loadModules();
    };

    return {
      'default': TestLoader,
      addModuleIncludeMatcher: addModuleIncludeMatcher,
      addModuleExcludeMatcher: addModuleExcludeMatcher
    };
  }
);
})();
