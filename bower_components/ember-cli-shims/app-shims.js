(function() {
/* global define, Ember */
define('ember', [], function() {
  "use strict";

  return {
    'default': Ember
  };
});

define('ember-data', [], function() {
  "use strict";

  return {
    'default': DS
  };
});
})();

define('jquery', [], function() {
  "use strict";

  return {
    'default': jQuery
  };
});
