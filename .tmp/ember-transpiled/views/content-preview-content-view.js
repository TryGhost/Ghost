define("ghost/views/content-preview-content-view", 
  ["ghost/utils/set-scroll-classname","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];

    var PostContentView = Ember.View.extend({
        classNames: ['content-preview-content'],

        didInsertElement: function () {
            var el = this.$();
            el.on('scroll', Ember.run.bind(el, setScrollClassName, {
                target: el.closest('.content-preview'),
                offset: 10
            }));
        },

        contentObserver: function () {
            this.$().closest('.content-preview').scrollTop(0);
        }.observes('controller.content'),

        willDestroyElement: function () {
            var el = this.$();
            el.off('scroll');
        }
    });

    __exports__["default"] = PostContentView;
  });