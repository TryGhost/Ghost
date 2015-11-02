import Ember from 'ember';

const {isBlank} = Ember;

export default Ember.Component.extend({
    classNames: ['view-container'],
    classNameBindings: ['isMobile'],

    mobileWidth: 600,
    tags: null,
    selectedTag: null,

    isMobile: false,
    isEmpty: Ember.computed.equal('tags.length', 0),

    resizeService: Ember.inject.service('resize-service'),

    _resizeListener: null,

    displaySettingsPane: Ember.computed('isEmpty', 'selectedTag', 'isMobile', function () {
        const isEmpty = this.get('isEmpty'),
              selectedTag = this.get('selectedTag'),
              isMobile = this.get('isMobile');

        // always display settings pane for blank-slate on mobile
        if (isMobile && isEmpty) {
            return true;
        }

        // display list if no tag is selected on mobile
        if (isMobile && isBlank(selectedTag)) {
            return false;
        }

        // default to displaying settings pane
        return true;
    }),

    toggleMobile: function () {
        let width = Ember.$(window).width();

        if (width < this.get('mobileWidth')) {
            this.set('isMobile', true);
            this.sendAction('enteredMobile');
        } else {
            this.set('isMobile', false);
            this.sendAction('leftMobile');
        }
    },

    didInitAttrs: function () {
        this._resizeListener = Ember.run.bind(this, this.toggleMobile);
        this.get('resizeService').on('debouncedDidResize', this._resizeListener);
        this.toggleMobile();
    },

    willDestroyElement: function () {
        this.get('resizeService').off('debouncedDidResize', this._resizeListener);
    }
});
