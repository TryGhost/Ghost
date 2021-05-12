import Component from '@ember/component';
import formatMarkdown from 'ghost-admin/utils/format-markdown';
import {computed} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {htmlSafe} from '@ember/template';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {set} from '@ember/object';
import {task, timeout} from 'ember-concurrency';

const {countWords, countImages} = ghostHelperUtils;
const MIN_HEIGHT = 130;

export default Component.extend({
    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,
    headerOffset: 0,

    // internal attrs
    bottomOffset: 0,
    preventClick: false,

    // closure actions
    editCard() {},
    saveCard() {},
    selectCard() {},
    deselectCard() {},
    deleteCard() {},
    registerComponent() {},

    counts: computed('renderedMarkdown', function () {
        return {
            wordCount: countWords(this.renderedMarkdown),
            imageCount: countImages(this.renderedMarkdown)
        };
    }),

    renderedMarkdown: computed('payload.markdown', function () {
        return htmlSafe(formatMarkdown(this.payload.markdown));
    }),

    toolbar: computed('isEditing', function () {
        if (this.isEditing) {
            return false;
        }

        return {
            items: [{
                buttonClass: 'fw4 flex items-center white',
                icon: 'koenig/kg-edit',
                iconClass: 'fill-white',
                title: 'Edit',
                text: '',
                action: run.bind(this, this.editCard)
            }]
        };
    }),

    init() {
        this._super(...arguments);

        if (!this.payload) {
            this.set('payload', {});
        }

        // subtract toolbar height from MIN_HEIGHT so the trigger happens at
        // the expected position without forcing the min height to be too small
        this.set('bottomOffset', -MIN_HEIGHT);

        this.registerComponent(this);
    },

    willDestroyElement() {
        this._super(...arguments);
        this._teardownResizeHandler();
    },

    actions: {
        enterEditMode() {
            this._preventAccidentalClick.perform();
        },

        leaveEditMode() {
            if (isBlank(this.payload.markdown)) {
                // afterRender is required to avoid double modification of `isSelected`
                // TODO: see if there's a way to avoid afterRender
                run.scheduleOnce('afterRender', this, this.deleteCard);
            }
        },

        updateMarkdown(markdown) {
            let payload = this.payload;
            let save = this.saveCard;

            set(payload, 'markdown', markdown);

            // update the mobiledoc and stay in edit mode
            save(payload, false);
        },

        // fires if top comes into view 0 px from viewport top
        // fires if top comes into view MIN_HEIGHTpx above viewport bottom
        topEntered() {
            this._isTopVisible = true;
            run.scheduleOnce('actions', this, this._applyToolbarStyles);
        },

        // fires if top leaves viewport 0 px from viewport top
        // fires if top leaves viewport MIN_HEIGHTpx above viewport bottom
        topExited() {
            let top = this._topElement.getBoundingClientRect().top;
            this._isTopVisible = false;
            this._isTopAbove = top < 0;
            run.scheduleOnce('actions', this, this._applyToolbarStyles);
        },

        bottomEntered() {
            this._isBottomVisible = true;
            run.scheduleOnce('actions', this, this._applyToolbarStyles);
        },

        bottomExited() {
            let top = this._bottomElement.getBoundingClientRect().top;
            this._isBottomVisible = false;
            this._isBottomBelow = top > window.innerHeight;
            run.scheduleOnce('actions', this, this._applyToolbarStyles);
        },

        registerTop(element) {
            this._topElement = element;
        },

        registerBottom(element) {
            this._bottomElement = element;
        }
    },

    _applyToolbarStyles() {
        let toolbar = this.element.querySelector('.editor-toolbar');

        if (!toolbar) {
            return;
        }

        let {left, width} = this._containerDimensions();

        let style = '';
        let stuckTop = `top: ${MIN_HEIGHT}px; bottom: auto`;
        let fixedBottom = `position: fixed; left: ${left + 1}px; width: ${width - 2}px`;
        let stuckBottom = '';

        if (this._isTopVisible && this._isBottomVisible) {
            style = stuckBottom;
        }

        if (this._isTopVisible && !this._isBottomVisible) {
            style = fixedBottom;
        }

        if (!this._isTopVisible && !this._isTopAbove) {
            style = stuckTop;
        }

        if (!this._isTopVisible && this._isBottomVisible) {
            style = stuckBottom;
        }

        if (!this._isTopVisible && !this._isBottomVisible && this._isTopAbove && this._isBottomBelow) {
            style = fixedBottom;
        }

        // set up resize watchers if in fixed position because we have to
        // recalculate left position and width
        if (!this._resizeHandler && style === fixedBottom) {
            this._setupResizeHandler();
        } else if (this._resizeHandler && style !== fixedBottom) {
            this._teardownResizeHandler();
        }

        // account for the mobile nav bar when in fixed position
        if (style === fixedBottom) {
            let mobileNav = document.querySelector('.gh-mobile-nav-bar');

            if (mobileNav.offsetHeight) {
                style = `${style}; bottom: ${mobileNav.offsetHeight}px`;
            }
        }

        toolbar.setAttribute('style', style);
    },

    _containerDimensions() {
        return this.element.querySelector('.kg-card-selected').getBoundingClientRect();
    },

    _setupResizeHandler() {
        if (this._resizeHandler) {
            return;
        }

        this._resizeHandler = run.bind(this, this._applyToolbarStyles);
        window.addEventListener('resize', this._resizeHandler);
    },

    _teardownResizeHandler() {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
    },

    // when entering edit mode it can be easy to accidentally click where the
    // toolbar is inserted. Setting `preventClick` to true adds an overlay, so
    // we set that for half a second to stop double-clicks hitting the toolbar
    _preventAccidentalClick: task(function* () {
        this.set('preventClick', true);
        yield timeout(500);
        this.set('preventClick', false);
    })

});
