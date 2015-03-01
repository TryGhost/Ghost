define("ghost/mixins/settings-menu-controller", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsMenuControllerMixin = Ember.Mixin.create({
        needs: 'application',

        isViewingSubview: Ember.computed('controllers.application.showSettingsMenu', function (key, value) {
            // Not viewing a subview if we can't even see the PSM
            if (!this.get('controllers.application.showSettingsMenu')) {
                return false;
            }
            if (arguments.length > 1) {
                return value;
            }

            return false;
        }),

        actions: {
            showSubview: function () {
                this.set('isViewingSubview', true);
            },

            closeSubview: function () {
                this.set('isViewingSubview', false);
            }
        }
    });

    __exports__["default"] = SettingsMenuControllerMixin;
  });