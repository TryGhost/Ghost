import Ember from 'ember';

const {isBlank} = Ember;

export default Ember.Component.extend({
    classNames: ['view-container'],
    classNameBindings: ['isMobile'],

    mediaQueries: Ember.inject.service(),

    tags: null,
    selectedTag: null,

    isMobile: Ember.computed.reads('mediaQueries.maxWidth600'),
    isEmpty: Ember.computed.equal('tags.length', 0),

    init: function () {
        this._super(...arguments);
        Ember.run.schedule('actions', this, this.fireMobileChangeActions);
    },

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

    fireMobileChangeActions: Ember.observer('isMobile', function () {
        if (!this.get('isMobile')) {
            this.sendAction('leftMobile');
        }
    })
});
