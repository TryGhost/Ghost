var define, requireModule, require, requirejs;

(function() {
  var registry = {}, seen = {}, state = {};
  var FAILED = false;

  define = function(name, deps, callback) {
    registry[name] = {
      deps: deps,
      callback: callback
    };
  };

  requirejs = require = requireModule = function(name) {
    if (state[name] !== FAILED &&
        seen.hasOwnProperty(name)) {
      return seen[name];
    }

    if (!registry.hasOwnProperty(name)) {
      throw new Error('Could not find module ' + name);
    }

    var mod = registry[name];
    var deps = mod.deps;
    var callback = mod.callback;
    var reified = [];
    var exports;
    var value;
    var loaded = false;

    seen[name] = { }; // enable run-time cycles

    try {
      for (var i=0, l=deps.length; i<l; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          reified.push(requireModule(resolve(deps[i], name)));
        }
      }

      value = callback.apply(this, reified);
      loaded = true;
    } finally {
      if (!loaded) {
        state[name] = FAILED;
      }
    }
    return seen[name] = exports || value;
  };

  function resolve(child, name) {
    if (child.charAt(0) !== '.') { return child; }

    var parts = child.split('/');
    var parentBase = name.split('/').slice(0, -1);

    for (var i = 0, l = parts.length; i < l; i++) {
      var part = parts[i];

      if (part === '..') { parentBase.pop(); }
      else if (part === '.') { continue; }
      else { parentBase.push(part); }
    }

    return parentBase.join('/');
  }

  requirejs._eak_seen = registry;
  requirejs.clear = function(){
    requirejs._eak_seen = registry = {};
    seen = {};
  };
})();
