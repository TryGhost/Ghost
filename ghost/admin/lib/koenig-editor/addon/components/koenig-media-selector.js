import Component from '@glimmer/component';
import {action} from '@ember/object';
import {run} from '@ember/runloop';

const Y_OFFSET = 40;

export default class KoenigMediaSelectorComponent extends Component {
    constructor() {
        super(...arguments);

        // store editor range for later because it might change if focus is lost
        this._editorRange = this.args.editorRange;

        // store scroll position before anything else renders
        const scrollContainer = document.querySelector(this.args.scrollContainerSelector);
        this._scrollTop = scrollContainer.scrollTop;
    }

    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('click', this.handleBackgroundClick);
    }

    @action
    didInsertContainer(containerElem) {
        this._containerElem = containerElem;

        this._positionSelector(this._editorRange);
        this.resetScrollPosition();

        // any click outside of the selector should close it and clear any /command
        // add with 1ms delay so current event loop finishes to avoid instaclose
        run.later(() => {
            window.addEventListener('click', this.handleBackgroundClick);
        });
    }

    @action
    resetScrollPosition() {
        const scrollContainer = document.querySelector(this.args.scrollContainerSelector);
        const scrollContainerRect = scrollContainer.getBoundingClientRect();
        const containerRect = this._containerElem.getBoundingClientRect();

        let scrollTop = this._scrollTop;

        const scrollBottom = scrollTop + scrollContainerRect.height;
        const containerBottom = scrollTop + containerRect.bottom;

        if (containerBottom > scrollBottom) {
            // bottom of selector is cut-off, scroll it into view

            const amountCutOffBottom = containerBottom - scrollBottom;

            // container 600px - inner container 540px = 60px of shadow
            // cut 40px off to give a 20px spacing from bottom of screen
            const bottomBuffer = 40;

            let scrollAdjustment = amountCutOffBottom - bottomBuffer;

            // don't scroll so much the top of the container gets hidden
            const newContainerTop = containerRect.top - scrollAdjustment;
            const minDistanceFromTop = 20;
            if (newContainerTop < minDistanceFromTop) {
                const amountCutOffTop = Math.abs(newContainerTop - minDistanceFromTop);
                scrollAdjustment = scrollAdjustment - amountCutOffTop;
            }

            scrollTop = scrollTop + scrollAdjustment;
        }

        scrollContainer.scrollTop = scrollTop;
    }

    @action
    insertCard(cardName, payload) {
        this.args.replaceWithCardSection(cardName, this._editorRange, payload);
        this.args.close();
    }

    @action
    handleBackgroundClick(event) {
        if (!this._containerElem.contains(event.target)) {
            this.args.editor.run((postEditor) => {
                postEditor.deleteRange(this._editorRange.tail.section.toRange());
            });
            this.args.close();
        }
    }

    @action
    handleEscape() {
        this.args.close();
        this.args.editor.selectRange(this._editorRange.tail);
    }

    _positionSelector(range) {
        const {head: {section}} = range;

        if (section && section.renderNode.element) {
            const containerRect = this._containerElem.parentNode.getBoundingClientRect();
            const selectedElement = section.renderNode.element;
            const selectedElementRect = selectedElement.getBoundingClientRect();
            const top = selectedElementRect.top - containerRect.top + Y_OFFSET;

            this._containerElem.style.top = `${top}px`;
        }
    }
}
