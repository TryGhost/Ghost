define("ghost/models/notification", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Notification = DS.Model.extend({
        dismissible: DS.attr('boolean'),
        location: DS.attr('string'),
        status: DS.attr('string'),
        type: DS.attr('string'),
        message: DS.attr('string')
    });

    __exports__["default"] = Notification;
  });