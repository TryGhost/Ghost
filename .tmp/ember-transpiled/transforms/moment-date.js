define("ghost/transforms/moment-date", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global moment */
    var MomentDate = DS.Transform.extend({
        deserialize: function (serialized) {
            if (serialized) {
                return moment(serialized);
            }
            return serialized;
        },
        serialize: function (deserialized) {
            if (deserialized) {
                return moment(deserialized).toDate();
            }
            return deserialized;
        }
    });
    __exports__["default"] = MomentDate;
  });