define("ghost/adapters/application", 
  ["ghost/adapters/embedded-relation-adapter","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EmbeddedRelationAdapter = __dependency1__["default"];

    var ApplicationAdapter = EmbeddedRelationAdapter.extend();

    __exports__["default"] = ApplicationAdapter;
  });