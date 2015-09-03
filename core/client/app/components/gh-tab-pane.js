import Ember from 'ember';
// See gh-tabs-manager.js for use
var TabPane = Ember.Component.extend({
    classNameBindings: ['active'],

    tabsManager: Ember.computed(function () {
        return this.nearestWithProperty('isTabsManager');
    }),

    tab: Ember.computed('tabsManager.tabs.[]', 'tabsManager.tabPanes.[]', function () {
        var index = this.get('tabsManager.tabPanes').indexOf(this),
            tabs = this.get('tabsManager.tabs');

        return tabs && tabs.objectAt(index);
    }),

    active: Ember.computed.alias('tab.active'),

    willRender: function () {
        // Register with the tabs manager
        this.get('tabsManager').registerTabPane(this);
    },

    willDestroyElement: function () {
        // Deregister with the tabs manager
        this.get('tabsManager').unregisterTabPane(this);
    }
});

export default TabPane;
