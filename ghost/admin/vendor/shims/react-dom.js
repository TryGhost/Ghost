(function() {
  function vendorModule() {
    'use strict';

    return {
      'default': self['react-dom'],
      __esModule: true,
    };
  }

  define('react-dom', [], vendorModule);
})();
