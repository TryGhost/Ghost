import Component from '@ember/component';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';
import {reads} from '@ember/object/computed';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

let instancesCounter = 0;

let triangleClassPositions = {
    'top-left': {
        attachment: 'top left',
        targetAttachment: 'bottom center',
        offset: '0 28px'
    },
    top: {
        attachment: 'top center',
        targetAttachment: 'bottom center'
    },
    'top-right': {
        attachment: 'top right',
        targetAttachment: 'bottom center',
        offset: '0 -28px'
    },
    'right-top': {
        attachment: 'top right',
        targetAttachment: 'middle left',
        offset: '28px 0'
    },
    right: {
        attachment: 'middle right',
        targetAttachment: 'middle left'
    },
    'right-bottom': {
        attachment: 'bottom right',
        targetAttachment: 'middle left',
        offset: '-28px 0'
    },
    'bottom-right': {
        attachment: 'bottom right',
        targetAttachment: 'top center',
        offset: '0 -28px'
    },
    bottom: {
        attachment: 'bottom center',
        targetAttachment: 'top center'
    },
    'bottom-left': {
        attachment: 'bottom left',
        targetAttachment: 'top center',
        offset: '0 28px'
    },
    'left-bottom': {
        attachment: 'bottom left',
        targetAttachment: 'middle right',
        offset: '-28px 0'
    },
    left: {
        attachment: 'middle left',
        targetAttachment: 'middle right'
    },
    'left-top': {
        attachment: 'top left',
        targetAttachment: 'middle right',
        offset: '28px 0'
    }
};

const GhTourItemComponent = Component.extend({

    mediaQueries: service(),
    tour: service(),
    ui: service(),

    tagName: '',

    throbberId: null,
    target: null,
    throbberAttachment: 'middle center',
    popoverTriangleClass: 'top',
    isOpen: false,

    _elementId: null,
    _throbber: null,
    _throbberElementId: null,
    _throbberElementSelector: null,
    _popoverAttachment: null,
    _popoverTargetAttachment: null,
    _popoverOffset: null,

    isMobile: reads('mediaQueries.isMobile'),
    isVisible: computed('isMobile', '_throbber', 'ui.showTour', function () {
        let showTour = this.ui.showTour;
        let isMobile = this.isMobile;
        let hasThrobber = !isBlank(this._throbber);

        return showTour && !isMobile && hasThrobber;
    }),

    init() {
        this._super(...arguments);
        // this is a tagless component so we need to generate our own elementId
        this._elementId = instancesCounter += 1;
        this._throbberElementId = `throbber-${this._elementId}`;
        this._throbberElementSelector = `#throbber-${this._elementId}`;

        this._handleOptOut = run.bind(this, this._remove);
        this._handleViewed = run.bind(this, this._removeIfViewed);

        this.tour.on('optOut', this._handleOptOut);
        this.tour.on('viewed', this._handleViewed);
    },

    didReceiveAttrs() {
        let throbberId = this.throbberId;
        let throbber = this.tour.activeThrobber(throbberId);
        let triangleClass = this.popoverTriangleClass;
        let popoverPositions = triangleClassPositions[triangleClass];

        this._throbber = throbber;
        this._popoverAttachment = popoverPositions.attachment;
        this._popoverTargetAttachment = popoverPositions.targetAttachment;
        this._popoverOffset = popoverPositions.offset;
    },

    willDestroyElement() {
        this.tour.off('optOut', this._handleOptOut);
        this.tour.off('viewed', this._handleViewed);
        this._super(...arguments);
    },

    actions: {
        open() {
            this.set('isOpen', true);
        },

        close() {
            this._close();
        },

        markAsViewed() {
            let throbberId = this.throbberId;
            this.tour.markThrobberAsViewed(throbberId);
            this.set('_throbber', null);
            this._close();
        },

        optOut() {
            this.tour.optOut();
            this.set('_throbber', null);
            this._close();
        }
    },

    _removeIfViewed(id) {
        if (id === this.throbberId) {
            this._remove();
        }
    },

    _remove() {
        this.set('_throbber', null);
    },

    _close() {
        this.set('isOpen', false);
    }
});

export default GhTourItemComponent;
