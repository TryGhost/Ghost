define("ghost/views/paginated-scroll-box", 
  ["ghost/utils/set-scroll-classname","ghost/mixins/pagination-view-infinite-scroll","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];
    var PaginationViewMixin = __dependency2__["default"];

    var PaginatedScrollBox = Ember.View.extend(PaginationViewMixin, {
        attachScrollClassHandler: function () {
            var el = this.$();
            el.on('scroll', Ember.run.bind(el, setScrollClassName, {
                target: el.closest('.content-list'),
                offset: 10
            }));
        }.on('didInsertElement'),

        detachScrollClassHandler: function () {
            this.$().off('scroll');
        }.on('willDestroyElement')
    });

    __exports__["default"] = PaginatedScrollBox;
  });