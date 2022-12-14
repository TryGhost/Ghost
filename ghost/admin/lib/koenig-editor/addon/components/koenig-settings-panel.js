import Component from '@glimmer/component';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {task} from 'ember-concurrency';
import {timeout} from 'ember-concurrency';

const CARD_SPACING = 20;
const MIN_RIGHT_SPACING = 20;
const MIN_TOP_SPACING = 66 + 20; // 66 is publish menu and word count size

export default class KoenigSettingsPanelComponent extends Component {
    constructor() {
        super(...arguments);
        this._windowResizeHandler = bind(this, this.debounceWindowResizeTask.perform);
        window.addEventListener('resize', this._windowResizeHandler);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('resize', this._windowResizeHandler);
    }

    @action
    registerAndPosition(panelElem) {
        this.panelElem = panelElem;
        this.positionPanel(panelElem);
    }

    @action
    positionPanel(panelElem) {
        if (!panelElem) {
            return;
        }

        const panelRect = panelElem.getBoundingClientRect();
        const containerRect = panelElem.parentElement.getBoundingClientRect();

        const containerMiddle = containerRect.top + (containerRect.height / 2);

        // position vertically centered
        // if part of panel would be off screen adjust to keep minimum distance from window top/botom
        let top = Math.max(containerMiddle - (panelRect.height / 2), MIN_TOP_SPACING);
        if (top + panelRect.height > window.innerHeight - MIN_TOP_SPACING) {
            top = window.innerHeight - MIN_TOP_SPACING - panelRect.height;
        }

        // position to right of panel
        // if part of panel would be off screen adjust to keep minimum distance from window edge
        let left = containerRect.right + CARD_SPACING;
        if (left + panelRect.width > window.innerWidth - MIN_RIGHT_SPACING) {
            left = window.innerWidth - panelRect.width - MIN_RIGHT_SPACING;
        }

        panelElem.style.top = `${top}px`;
        panelElem.style.left = `${left}px`;
    }

    @task({restartable: true})
    *debounceWindowResizeTask() {
        yield timeout(250);
        this.positionPanel(this.panelElem);
    }

    // called when panel is expanded/collapsed by changing settings
    @action
    calculateResizeAdjustment(panelElem, {x, y}) {
        const panelRect = panelElem.getBoundingClientRect();

        const topIsOffscreen = panelRect.top < 0;
        const bottomIsOffscreen = panelRect.bottom > window.innerHeight;

        if (topIsOffscreen && bottomIsOffscreen) {
            // there's not much we can do here, the screen is too small.
            // leave as-is to avoid any weird jumping
            return {x, y};
        }

        if (topIsOffscreen) {
            const yAdjustment = Math.abs(panelRect.top) + 10;

            return {x, y: y + yAdjustment};
        }

        if (bottomIsOffscreen) {
            const yAdjustment = -Math.abs(panelRect.bottom - window.innerHeight) - 10;

            return {x, y: y + yAdjustment};
        }

        // no adjustment needed
        return {x, y};
    }
}
