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

    // Register with the tabs manager
    registerWithTabs: function () {
        this.get('tabsManager').registerTabPane(this);
    }.on('didInsertElement'),

    unregisterWithTabs: function () {
        this.get('tabsManager').unregisterTabPane(this);
    }.on('willDestroyElement')
});

export default TabPane;
