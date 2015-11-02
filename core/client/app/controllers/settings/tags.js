import Ember from 'ember';

const {computed, inject} = Ember,
      {alias, equal, sort} = computed;

export default Ember.Controller.extend({

    tagController: inject.controller('settings.tags.tag'),

    // set at controller level because it's shared by routes and components
    mobileWidth: 600,

    isMobile: false,
    selectedTag: alias('tagController.tag'),

    tagListFocused: equal('keyboardFocus', 'tagList'),
    tagContentFocused: equal('keyboardFocus', 'tagContent'),

    // TODO: replace with ordering by page count once supported by the API
    tags: sort('model', function (a, b) {
        const idA = +a.get('id'),
              idB = +b.get('id');

        if (idA > idB) {
            return 1;
        } else if (idA < idB) {
            return -1;
        }

        return 0;
    }),

    actions: {
        enteredMobile: function () {
            this.set('isMobile', true);
        },

        leftMobile: function () {
            this.set('isMobile', false);

            // redirect to first tag if possible so that you're not left with
            // tag settings blank slate when switching from portrait to landscape
            if (this.get('tags.length') && !this.get('tagController.tag')) {
                this.transitionToRoute('settings.tags.tag', this.get('tags.firstObject'));
            }
        }
    }

});
