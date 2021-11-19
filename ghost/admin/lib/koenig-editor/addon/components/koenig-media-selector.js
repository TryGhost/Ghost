import Component from '@glimmer/component';
import {action} from '@ember/object';
import {run} from '@ember/runloop';

const Y_OFFSET = 0;

export default class KoenigMediaSelectorComponent extends Component {
    constructor() {
        super(...arguments);

        // store editor range for later because it might change if focus is lost
        this._editorRange = this.args.editorRange;
    }

    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('click', this.handleBackgroundClick);
    }

    @action
    didInsertContainer(containerElem) {
        this._containerElem = containerElem;

        this._positionSelector(this._editorRange);

        // any click outside of the selector should close it and clear any /command
        // add with 1ms delay so current event loop finishes to avoid instaclose
        run.later(() => {
            window.addEventListener('click', this.handleBackgroundClick);
        });
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
        let {head: {section}} = range;

        if (section && section.renderNode.element) {
            let containerRect = this._containerElem.parentNode.getBoundingClientRect();
            let selectedElement = section.renderNode.element;
            let selectedElementRect = selectedElement.getBoundingClientRect();
            let top = selectedElementRect.top - containerRect.top + Y_OFFSET;

            this._containerElem.style.top = `${top}px`;
        }
    }
}
