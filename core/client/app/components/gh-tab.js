import Ember from 'ember';

const {Component, computed} = Ember;

// See gh-tabs-manager.js for use
export default Component.extend({
    tabsManager: computed(function () {
        return this.nearestWithProperty('isTabsManager');
    }),

    active: computed('tabsManager.activeTab', function () {
        return this.get('tabsManager.activeTab') === this;
    }),

    index: computed('tabsManager.tabs.[]', function () {
        return this.get('tabsManager.tabs').indexOf(this);
    }),

    // Select on click
    click() {
        this.get('tabsManager').select(this);
    },

    willRender() {
        this._super(...arguments);
        // register the tabs with the tab manager
        this.get('tabsManager').registerTab(this);
    },

    willDestroyElement() {
        this._super(...arguments);
        // unregister the tabs with the tab manager
        this.get('tabsManager').unregisterTab(this);
    }
});
