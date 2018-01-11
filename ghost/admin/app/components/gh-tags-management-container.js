import Component from '@ember/component';
import {computed} from '@ember/object';
import {equal, reads} from '@ember/object/computed';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

export default Component.extend({
    mediaQueries: service(),

    classNames: ['view-container'],
    classNameBindings: ['isMobile'],

    tags: null,
    selectedTag: null,

    isMobile: reads('mediaQueries.maxWidth600'),
    isEmpty: equal('tags.length', 0),

    displaySettingsPane: computed('isEmpty', 'selectedTag', 'isMobile', function () {
        let isEmpty = this.get('isEmpty');
        let selectedTag = this.get('selectedTag');
        let isMobile = this.get('isMobile');

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

    init() {
        this._super(...arguments);
        this.get('mediaQueries').on('change', this, this._fireMobileChangeActions);
    },

    willDestroyElement() {
        this._super(...arguments);
        this.get('mediaQueries').off('change', this, this._fireMobileChangeActions);
    },

    _fireMobileChangeActions(key, value) {
        if (key === 'maxWidth600') {
            let leftMobileAction = this.get('leftMobile');

            this.set('isMobile', value);

            if (!value && leftMobileAction) {
                leftMobileAction();
            }
        }
    }
});
