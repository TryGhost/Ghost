import Ember from 'ember';
// See gh-tabs-manager.js for use
var Tab = Ember.Component.extend({
    tabsManager: Ember.computed(function () {
        return this.nearestWithProperty('isTabsManager');
    }),

    active: Ember.computed('tabsManager.activeTab', function () {
        return this.get('tabsManager.activeTab') === this;
    }),

    index: Ember.computed('tabsManager.tabs.@each', function () {
        return this.get('tabsManager.tabs').indexOf(this);
    }),

    // Select on click
    click: function () {
        this.get('tabsManager').select(this);
    },

    willRender: function () {
        // register the tabs with the tab manager
        this.get('tabsManager').registerTab(this);
    },

    willDestroyElement: function () {
        // unregister the tabs with the tab manager
        this.get('tabsManager').unregisterTab(this);
    }
});

export default Tab;
