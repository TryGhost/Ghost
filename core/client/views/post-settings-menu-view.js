/* global moment */
import {formatDate} from 'ghost/utils/date-formatting';

var PostSettingsMenuView = Ember.View.extend({
    templateName: 'post-settings-menu',
    classNames: ['post-settings-menu', 'menu-drop-right', 'overlay'],
    classNameBindings: ['controller.isEditingSettings::hidden'],
    publishedAtBinding: Ember.Binding.oneWay('controller.publishedAt'),
    click: function (event) {
        //Stop click propagation to prevent window closing
        event.stopPropagation();
    },
    datePlaceholder: function () {
        return formatDate(moment());
    }.property('controller.publishedAt')
});

export default PostSettingsMenuView;
