import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {attributeBindings, classNameBindings} from '@ember-decorators/component';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const TICK_HEIGHT = 8;

@classic
@attributeBindings('_style:style')
@classNameBindings('selectedClass')
export default class KoenigCard extends Component {
    @service koenigUi;

    // attrs
    editor = null;
    icon = null;
    iconClass = 'ih5 absolute stroke-midgrey-l2 mt1 nl15 kg-icon';
    toolbar = null;
    isSelected = false;
    isEditing = false;
    hasEditMode = true;
    headerOffset = 0;
    showSelectedOutline = true;

    // properties
    showToolbar = false;
    toolbarWidth = 0;
    toolbarHeight = 0;

    // internal properties
    _lastIsEditing = false;

    // closure actions
    selectCard() {}
    deselectCard() {}
    editCard() {}

    // hooks - when attached these will be fired on the individual card components
    onSelect() {}
    onDeselect() {}
    onEnterEdit() {}
    onLeaveEdit() {}

    @computed('showToolbar', 'koenigUi.{captionHasFocus,isDragging,inputHasFocus}')
    get shouldShowToolbar() {
        return this.showToolbar
            && !this.koenigUi.captionHasFocus
            && !this.koenigUi.inputHasFocus
            && !this.koenigUi.isDragging;
    }

    @computed('shouldShowToolbar', 'toolbarWidth', 'toolbarHeight')
    get toolbarStyle() {
        let showToolbar = this.shouldShowToolbar;
        let width = this.toolbarWidth;
        let height = this.toolbarHeight;
        let styles = [];

        styles.push(`top: -${height}px`);
        styles.push(`left: calc(50% - ${width / 2}px)`);

        if (!showToolbar) {
            styles.push('pointer-events: none !important');
        }

        return htmlSafe(styles.join('; '));
    }

    @computed('headerOffset')
    get iconTop() {
        return this.headerOffset + 24;
    }

    @computed('isSelected', 'showSelectedOutline')
    get selectedClass() {
        return this.isSelected && this.showSelectedOutline ? 'kg-card-selected' : '';
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        let isSelected = this.isSelected;
        let isEditing = this.isEditing;
        let hasEditMode = this.hasEditMode;

        // TODO: replace with Spirit classes
        let baseStyles = 'cursor: default; caret-color: auto;';
        this.set('_style', htmlSafe(`${baseStyles} ${this.style || ''}`));

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

        // show the toolbar immediately if it changes whilst the card is selected
        // caters for situations such as only showing image style buttons once an
        // image has been uploaded
        if (isSelected && this._lastIsSelected && this.toolbar && this.toolbar !== this._lastToolbar) {
            run.scheduleOnce('afterRender', this, this._showToolbar);
        }

        if (isSelected && this._lastIsSelected && this.saveAsSnippet && this.saveAsSnippet !== this._lastSaveAsSnippet) {
            run.scheduleOnce('afterRender', this, this._showToolbar);
        }

        this._lastIsSelected = isSelected;
        this._lastIsEditing = isEditing;
        this._lastToolbar = this.toolbar;
        this._lastSaveAsSnippet = this.saveAsSnippet;
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        this._setToolbarProperties();
        this._createMutationObserver(
            this.element,
            run.bind(this, this._inputFocus),
            run.bind(this, this._inputBlur)
        );
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        window.removeEventListener('keydown', this._onKeydownHandler);
        window.removeEventListener('click', this._onClickHandler);
        this._removeMousemoveHandler();

        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
        }

        if (this._hasDisabledContenteditable) {
            this.editor.element.contentEditable = true;
        }
    }

    mouseDown(event) {
        let {isSelected, isEditing, hasEditMode} = this;

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
            let allowClickthrough = !!event.target.closest('[data-kg-allow-clickthrough]');
            if (!allowedTagNames.includes(targetTagName) && !allowClickthrough) {
                event.preventDefault();
            }

            // don't trigger edit mode immediately
            this._skipMouseUp = true;
        }

        // don't trigger select->edit transition for clicks in the caption or
        // when clicking out of the caption
        if (isSelected && hasEditMode) {
            let allowClickthrough = !!event.target.closest('[data-kg-allow-clickthrough]');
            if (allowClickthrough || this.koenigUi.captionHasFocus) {
                this._skipMouseUp = true;
            }
        }
    }

    // lazy-click to enter edit mode
    mouseUp(event) {
        let {isSelected, isEditing, hasEditMode, _skipMouseUp} = this;

        // we want to allow toolbar buttons to be clicked without going into edit mode
        if (event.target.closest('[data-kg-toolbar]')) {
            this._skipMouseUp = true;
            return;
        }

        if (!_skipMouseUp && hasEditMode && isSelected && !isEditing && !this.koenigUi.isDragging) {
            this.editCard();
            this.set('showToolbar', true);
            event.preventDefault();
        }

        this._skipMouseUp = false;
    }

    doubleClick() {
        let allowClickthrough = !!event.target.closest('[data-kg-allow-clickthrough]');
        if (this.hasEditMode && !this.isEditing && !allowClickthrough) {
            this.editCard();
            this.set('showToolbar', true);
        }
    }

    _onSelect() {
        this._fireWhenRendered(this._showToolbar);
        this._showToolbar();
        this.onSelect();

        this._onClickHandler = run.bind(this, this._handleClick);
        window.addEventListener('click', this._onClickHandler);
    }

    _onDeselect() {
        window.removeEventListener('click', this._onClickHandler);
        this._hideToolbar();
        this.onDeselect();
    }

    _onEnterEdit() {
        // don't register key down handlers immediately otherwise we can interfere
        // with keyboard events that have just put the card into edit mode
        run.later(this, function () {
            if (this.isEditing && !this.isDestroyed && !this.isDestroying) {
                this._onKeydownHandler = run.bind(this, this._handleKeydown);
                window.addEventListener('keydown', this._onKeydownHandler);
            }
        }, 20);

        this.onEnterEdit();
    }

    _onLeaveEdit() {
        window.removeEventListener('keydown', this._onKeydownHandler);

        // if the payload has changed but not been saved, save it now
        if (this.env && JSON.stringify(this.payload) !== JSON.stringify(this.env.postModel.payload)) {
            this.editor.run(() => {
                this.saveCard(this.payload);
            });
        }

        this.onLeaveEdit();
    }

    _setToolbarProperties() {
        // select the last toolbar in the element because card contents/captions
        // may have their own toolbar elements
        let toolbar = this.element?.querySelector(':scope > [data-kg-toolbar="true"]');

        if (!toolbar) {
            return;
        }

        let {width, height} = toolbar.getBoundingClientRect();

        this.setProperties({
            toolbarWidth: width,
            toolbarHeight: height + TICK_HEIGHT
        });
    }

    _showToolbar() {
        // only show a toolbar if we have one
        if (this.toolbar || this.saveAsSnippet) {
            this._setToolbarProperties();

            if (!this.showToolbar && !this._onMousemoveHandler) {
                this._onMousemoveHandler = run.bind(this, this._handleMousemove);
                window.addEventListener('mousemove', this._onMousemoveHandler);
            }
        }
    }

    _hideToolbar() {
        this.set('showToolbar', false);
        this._removeMousemoveHandler();
    }

    _handleKeydown(event) {
        if (
            this.isEditing
            && event.key === 'Escape'
            || (Browser.isMac() && event.key === 'Enter' && event.metaKey)
            || (!Browser.isMac() && event.key === 'Enter' && event.ctrlKey)
        ) {
            // run the select card routine with isEditing=false to exit edit mode
            this.selectCard(false);
            event.preventDefault();
        }
    }

    // exit edit mode any time we have a click outside of the card unless it's
    // a click inside one of our modals or on the plus menu
    _handleClick(event) {
        let {target, path} = event;

        // Safari doesn't expose MouseEvent.path
        if (!path) {
            path = event.composedPath();
        }

        let searchPath = function (selector) {
            return element => element.closest && element.closest(selector);
        };

        // check if the click was in the card, on the plus menu, or on a modal
        if (this.element.contains(target)
            || path.find(searchPath(`#${this.element.id}`))
            || path.find(searchPath('[data-kg="plus-menu"]'))
            || path.find(searchPath('.liquid-destination'))) {
            return;
        }

        // if an element in the editor is clicked then cursor placement will
        // deselect or keep this card selected as necessary
        if (this.editor.element.contains(target)) {
            return;
        }

        this.deselectCard();
    }

    _handleMousemove() {
        if (!this.showToolbar) {
            this.set('showToolbar', true);
            this._removeMousemoveHandler();
        }
    }

    _removeMousemoveHandler() {
        window.removeEventListener('mousemove', this._onMousemoveHandler);
        this._onMousemoveHandler = null;
    }

    // convenience method for when we only want to run a method when our
    // elements have been rendered
    _fireWhenRendered(method) {
        if (this.element) {
            run.bind(this, method)();
        } else {
            run.scheduleOnce('afterRender', this, method);
        }
    }

    // Firefox can't handle inputs inside of a contenteditable element so we
    // need to watch for any inputs being added so that we can attach focus/blur
    // event handlers that can disable contenteditable on the editor element
    _createMutationObserver(target, focusCallback, blurCallback) {
        function addInputFocusListeners(mutation) {
            function addInputFocusListener(element) {
                if (!inputElements.includes(element)) {
                    inputElements.push(element);
                    element.addEventListener('focus', focusCallback, false);
                    element.addEventListener('blur', blurCallback, false);
                }
            }

            if (mutation.type === 'childList') {
                Array.prototype.forEach.call(
                    mutation.target.querySelectorAll('input[type="text"]'),
                    addInputFocusListener
                );
            }
        }

        function removeFromElements(element) {
            inputElements.splice(inputElements.indexOf(element), 1);
        }

        function removeInputFocusListener(element) {
            element.removeEventListener('focus', focusCallback, false);
            element.removeEventListener('blur', blurCallback, false);
            removeFromElements(element);
        }

        function mutationObserved(mutations) {
            mutations.forEach(addInputFocusListeners);
        }

        function createMutationObserver(mutationTarget) {
            let config = {
                childList: true,
                subtree: true
            };

            let observer = new MutationObserver(mutationObserved);
            observer.observe(mutationTarget, config); // eslint-disable-line ghost/ember/no-observers
            return observer;
        }

        let inputElements = [];
        let observer = createMutationObserver(target);

        return {
            disconnect() {
                if ('disconnect' in observer) {
                    observer.disconnect(); // eslint-disable-line ghost/ember/no-observers
                    inputElements.forEach(removeInputFocusListener);
                }
            }
        };
    }

    _inputFocus() {
        this._hasDisabledContenteditable = true;
        this.editor.element.contentEditable = false;
    }

    _inputBlur() {
        this._hasDisabledContenteditable = false;
        this.editor.element.contentEditable = true;
    }
}
