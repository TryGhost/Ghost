(function() {
  function vendorModule() {
    'use strict';

    return {
      'default': self['prop-types'],
      __esModule: true,
    };
  }

  define('prop-types', [], vendorModule);
})();
