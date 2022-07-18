(function() {
  function vendorModule() {
    'use strict';

    return {
      'default': self['react'],
      __esModule: true,
    };
  }

  define('react', [], vendorModule);
})();
