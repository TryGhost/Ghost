/* global moment */
import {formatDate} from 'ghost/utils/date-formatting';

var PostSettingsMenuView = Ember.View.extend({
    templateName: 'post-settings-menu',
    publishedAtBinding: Ember.Binding.oneWay('controller.publishedAt'),
    datePlaceholder: function () {
        return formatDate(moment());
    }.property('controller.publishedAt')
});

export default PostSettingsMenuView;
