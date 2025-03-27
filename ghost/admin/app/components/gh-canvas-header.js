import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhCanvasHeader extends Component {
    @action
    onScroll(element, scrollContainer) {
        if (this._isSticky && scrollContainer.scrollTop < 10) {
            element.classList.remove('gh-canvas-header--sticky');
            this._isSticky = false;
        } else if (!this._isSticky && scrollContainer.scrollTop > 10) {
            element.classList.add('gh-canvas-header--sticky');
            this._isSticky = true;
        }
    }
}
