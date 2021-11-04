import Modifier from 'ember-modifier';
import {action} from '@ember/object';

export default class MovableModifier extends Modifier {
    currentX = undefined;
    currentY = undefined;
    initialX = undefined;
    initialY = undefined;
    xOffset = 0;
    yOffset = 0;

    addStartEventListeners() {
        this.element.addEventListener('touchstart', this.dragStart, false);
        this.element.addEventListener('mousedown', this.dragStart, false);
    }

    removeStartEventListeners() {
        this.element.removeEventListener('touchstart', this.dragStart, false);
        this.element.removeEventListener('mousedown', this.dragStart, false);
    }

    addActiveEventListeners() {
        window.addEventListener('touchend', this.dragEnd, {capture: true, passive: false});
        window.addEventListener('touchmove', this.drag, {capture: true, passive: false});
        window.addEventListener('mouseup', this.dragEnd, {capture: true, passive: false});
        window.addEventListener('mousemove', this.drag, {capture: true, passive: false});
    }

    removeActiveEventListeners() {
        window.removeEventListener('touchend', this.dragEnd, {capture: true, passive: false});
        window.removeEventListener('touchmove', this.drag, {capture: true, passive: false});
        window.removeEventListener('mouseup', this.dragEnd, {capture: true, passive: false});
        window.removeEventListener('mousemove', this.drag, {capture: true, passive: false});
    }

    removeEventListeners() {
        this.removeStartEventListeners();
        this.removeActiveEventListeners();
    }

    didReceiveArguments() {
        this.removeEventListeners();
        this.addStartEventListeners();
    }

    willDestroy() {
        this.removeEventListeners();
    }

    @action
    dragStart(e) {
        if (e.type === 'touchstart' || e.button === 0) {
            if (e.type === 'touchstart') {
                this.initialX = e.touches[0].clientX - this.xOffset;
                this.initialY = e.touches[0].clientY - this.yOffset;
            } else {
                this.initialX = e.clientX - this.xOffset;
                this.initialY = e.clientY - this.yOffset;
            }

            for (const elem of (e.path || e.composedPath())) {
                if (elem === this.element) {
                    this.disableScroll();
                    this.disablePointerEvents();
                    this.addActiveEventListeners();
                    break;
                }
            }
        }
    }

    @action
    dragEnd(e) {
        e.preventDefault();
        this.enableScroll();
        this.enablePointerEvents();
        this.initialX = this.currentX;
        this.initialY = this.currentY;
        this.removeActiveEventListeners();
    }

    @action
    drag(e) {
        e.preventDefault();

        if (e.type === 'touchmove') {
            this.currentX = e.touches[0].clientX - this.initialX;
            this.currentY = e.touches[0].clientY - this.initialY;
        } else {
            this.currentX = e.clientX - this.initialX;
            this.currentY = e.clientY - this.initialY;
        }

        this.xOffset = this.currentX;
        this.yOffset = this.currentY;

        this.setTranslate(this.currentX, this.currentY);
    }

    setTranslate(xPos, yPos) {
        this.element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    disableScroll() {
        this.originalOverflow = this.element.style.overflow;
        this.element.style.overflow = 'hidden';
    }

    enableScroll() {
        this.element.style.overflow = this.originalOverflow;
    }

    // TODO: pointer events are not disabled because dragging to an area off
    // central editor canvas exits edit mode - investigate further
    disablePointerEvents() {
        // this.element.style.pointerEvents = 'none';
    }

    enablePointerEvents() {
        // this.element.style.pointerEvents = '';
    }
}
