import Ember from 'ember';

const {Component, computed} = Ember;
const {alias} = computed;

// See gh-tabs-manager.js for use
export default Component.extend({
    classNameBindings: ['active'],

    tabsManager: computed(function () {
        return this.nearestWithProperty('isTabsManager');
    }),

    tab: computed('tabsManager.tabs.[]', 'tabsManager.tabPanes.[]', function () {
        let index = this.get('tabsManager.tabPanes').indexOf(this);
        let tabs = this.get('tabsManager.tabs');

        return tabs && tabs.objectAt(index);
    }),

    active: alias('tab.active'),

    willRender() {
        this._super(...arguments);
        // Register with the tabs manager
        this.get('tabsManager').registerTabPane(this);
    },

    willDestroyElement() {
        this._super(...arguments);
        // Deregister with the tabs manager
        this.get('tabsManager').unregisterTabPane(this);
    }
});
