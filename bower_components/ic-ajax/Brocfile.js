module.exports = function(broccoli) {
  return require('broccoli-dist-es6-module')(broccoli.makeTree('lib'), {
    global: 'ic.ajax',
    packageName: 'ic-ajax',
    main: 'main',
    shim: {
      'ember': 'Ember'
    }
  });
};

