import Ember from 'ember';

const {
    computed,
    inject: {controller}
} = Ember;
const {alias, equal, sort} = computed;

export default Ember.Controller.extend({

    tagController: controller('settings.tags.tag'),

    selectedTag: alias('tagController.tag'),

    tagListFocused: equal('keyboardFocus', 'tagList'),
    tagContentFocused: equal('keyboardFocus', 'tagContent'),

    // TODO: replace with ordering by page count once supported by the API
    tags: sort('model', function (a, b) {
        let idA = +a.get('id');
        let idB = +b.get('id');

        if (idA > idB) {
            return 1;
        } else if (idA < idB) {
            return -1;
        }

        return 0;
    }),

    actions: {
        leftMobile() {
            let firstTag = this.get('tags.firstObject');
            // redirect to first tag if possible so that you're not left with
            // tag settings blank slate when switching from portrait to landscape
            if (firstTag && !this.get('tagController.tag')) {
                this.transitionToRoute('settings.tags.tag', firstTag);
            }
        }
    }

});
