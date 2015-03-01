define("ghost/models/tag", 
  ["ghost/mixins/validation-engine","ghost/mixins/nprogress-save","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var NProgressSaveMixin = __dependency2__["default"];

    var Tag = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
        validationType: 'tag',

        uuid: DS.attr('string'),
        name: DS.attr('string'),
        slug: DS.attr('string'),
        description: DS.attr('string'),
        parent: DS.attr(),
        meta_title: DS.attr('string'),
        meta_description: DS.attr('string'),
        image: DS.attr('string'),
        hidden: DS.attr('boolean'),
        created_at: DS.attr('moment-date'),
        updated_at: DS.attr('moment-date'),
        created_by: DS.attr(),
        updated_by: DS.attr(),
        post_count: DS.attr('number')
    });

    __exports__["default"] = Tag;
  });