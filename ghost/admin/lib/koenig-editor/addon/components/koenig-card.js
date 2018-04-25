import Component from '@ember/component';
import layout from '../templates/components/koenig-card';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {run} from '@ember/runloop';

const TICK_HEIGHT = 8;

export default Component.extend({
    layout,
    attributeBindings: ['style'],
    classNameBindings: ['isSelected:kg-card-selected'],

    // attrs
    icon: null,
    iconClass: 'ih5 absolute stroke-midgrey-l2 mt1 nl16 kg-icon',
    toolbar: null,
    isSelected: false,
    isEditing: false,
    hasEditMode: true,

    // properties
    showToolbar: false,
    toolbarWidth: 0,
    toolbarHeight: 0,

    // internal properties
    _lastIsEditing: false,

    // closure actions
    selectCard() {},
    editCard() {},
    // hooks - when attached these will be fired on the individual card components
    onSelect() {},
    onDeselect() {},
    onEnterEdit() {},
    onLeaveEdit() {},

    // TODO: replace with Spirit classes
    style: computed(function () {
        let baseStyles = 'cursor: default; caret-color: auto;';

        return htmlSafe(baseStyles);
    }),

    toolbarStyle: computed('showToolbar', 'toolbarWidth', 'toolbarHeight', function () {
        let showToolbar = this.get('showToolbar');
        let width = this.get('toolbarWidth');
        let height = this.get('toolbarHeight');
        let styles = [];

        styles.push(`top: -${height}px`);
        styles.push(`left: calc(50% - ${width / 2}px)`);

        if (!showToolbar) {
            styles.push('pointer-events: none !important');
        }

        return htmlSafe(styles.join('; '));
    }),

    didReceiveAttrs() {
        this._super(...arguments);

        let isSelected = this.get('isSelected');
        let isEditing = this.get('isEditing');
        let hasEditMode = this.get('hasEditMode');

        if (isSelected !== this._lastIsSelected) {
            if (isSelected) {
                this._fireWhenRendered(this._onSelect);
            } else {
                this._fireWhenRendered(this._onDeselect);
            }
        }

        if (isEditing !== this._lastIsEditing) {
            if (!hasEditMode) {
                isEditing = false;
            } else if (isEditing) {
                this._onEnterEdit();
            } else {
                this._onLeaveEdit();
            }
        }

        this._lastIsSelected = isSelected;
        this._lastIsEditing = isEditing;
    },

    didInsertElement() {
        this._super(...arguments);
        this._setToolbarProperties();
    },

    willDestroyElement() {
        this._super(...arguments);
        window.removeEventListener('keydown', this._onKeydownHandler);
        this._removeMousemoveHandler();
    },

    mouseDown(event) {
        let isSelected = this.get('isSelected');
        let isEditing = this.get('isEditing');
        let hasEditMode = this.get('hasEditMode');

        // if we perform an action we want to prevent the mousedown from
        // triggering a cursor position change which can result in multiple
        // card select calls getting the component into an odd state. We also
        // manually show the toolbar so that we're not relying on mousemove
        if (!isSelected && !isEditing) {
            this.selectCard();
            this.set('showToolbar', true);

            // in most situations we want to prevent default behaviour which
            // can cause an underlying cursor position change but inputs and
            // textareas are different and we want the focus to move to them
            // immediately when clicked
            let targetTagName = event.target.tagName;
            let allowedTagNames = ['INPUT', 'TEXTAREA'];
            if (!allowedTagNames.includes(targetTagName)) {
                event.preventDefault();
            }
        } else if (hasEditMode && isSelected && !isEditing) {
            this.editCard();
            this.set('showToolbar', true);
            event.preventDefault();
        }
    },

    doubleClick() {
        if (this.get('hasEditMode') && !this.get('isEditing')) {
            this.editCard();
            this.set('showToolbar', true);
        }
    },

    _onSelect() {
        this._fireWhenRendered(this._showToolbar);
        this._showToolbar();
        this.onSelect();
    },

    _onDeselect() {
        this._hideToolbar();
        this.onDeselect();
    },

    _onEnterEdit() {
        this._onKeydownHandler = run.bind(this, this._handleKeydown);
        window.addEventListener('keydown', this._onKeydownHandler);
        this.onEnterEdit();
    },

    _onLeaveEdit() {
        window.removeEventListener('keydown', this._onKeydownHandler);
        this.onLeaveEdit();
    },

    _setToolbarProperties() {
        if (this.get('toolbar')) {
            let toolbar = this.element.querySelector('[data-toolbar="true"]');
            let {width, height} = toolbar.getBoundingClientRect();

            this.setProperties({
                toolbarWidth: width,
                toolbarHeight: height + TICK_HEIGHT
            });
        }
    },

    _showToolbar() {
        // only show a toolbar if we have one
        if (this.get('toolbar')) {
            if (!this.get('showToolbar') && !this._onMousemoveHandler) {
                this._onMousemoveHandler = run.bind(this, this._handleMousemove);
                window.addEventListener('mousemove', this._onMousemoveHandler);
            }
        }
    },

    _hideToolbar() {
        this.set('showToolbar', false);
        this._removeMousemoveHandler();
    },

    _handleKeydown(event) {
        if (event.code === 'Escape' && this.get('isEditing')) {
            // run the select card routine with isEditing=false to exit edit mode
            this.selectCard(false);
            event.preventDefault();
        }
    },

    _handleMousemove() {
        if (!this.get('showToolbar')) {
            this.set('showToolbar', true);
            this._removeMousemoveHandler();
        }
    },

    _removeMousemoveHandler() {
        window.removeEventListener('mousemove', this._onMousemoveHandler);
        this._onMousemoveHandler = null;
    },

    // convenience method for when we only want to run a method when our
    // elements have been rendered
    _fireWhenRendered(method) {
        if (this.element) {
            run.bind(this, method)();
        } else {
            run.scheduleOnce('afterRender', this, method);
        }
    }
});
