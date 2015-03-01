define("ghost/serializers/tag", 
  ["ghost/serializers/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationSerializer = __dependency1__["default"];

    var TagSerializer = ApplicationSerializer.extend({
        serializeIntoHash: function (hash, type, record, options) {
            options = options || {};
            options.includeId = true;

            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Properties that exist on the model but we don't want sent in the payload

            delete data.uuid;
            delete data.post_count;

            hash[root] = [data];
        }
    });

    __exports__["default"] = TagSerializer;
  });