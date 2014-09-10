/* global moment */
import {formatDate} from 'ghost/utils/date-formatting';

var PostSettingsMenuView = Ember.View.extend({
    templateName: 'post-settings-menu',
    //@TODO Changeout the binding for a simple computedOneWay?
    publishedAtBinding: Ember.Binding.oneWay('controller.publishedAt'),
    datePlaceholder: Ember.computed('controller.publishedAt', function () {
        return formatDate(moment());
    }),

    animateOut: function () {
        $('body').removeClass('right-outlet-expanded');
    }.on('willDestroyElement')
});

export default PostSettingsMenuView;
