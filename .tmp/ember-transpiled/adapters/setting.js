define("ghost/adapters/setting", 
  ["ghost/adapters/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationAdapter = __dependency1__["default"];

    var SettingAdapter = ApplicationAdapter.extend({
        updateRecord: function (store, type, record) {
            var data = {},
                serializer = store.serializerFor(type.typeKey);

            // remove the fake id that we added onto the model.
            delete record.id;

            // use the SettingSerializer to transform the model back into
            // an array of settings objects like the API expects
            serializer.serializeIntoHash(data, type, record);

            // use the ApplicationAdapter's buildURL method but do not
            // pass in an id.
            return this.ajax(this.buildURL(type.typeKey), 'PUT', {data: data});
        }
    });

    __exports__["default"] = SettingAdapter;
  });