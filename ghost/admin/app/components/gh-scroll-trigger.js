import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

// TODO: move to a util - duplicated in koenig-editor/koenig-link-input
function getScrollParent(node) {
    const isElement = node instanceof HTMLElement;
    const overflowY = isElement && window.getComputedStyle(node).overflowY;
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

    if (!node) {
        return null;
    } else if (isScrollable && node.scrollHeight >= node.clientHeight) {
        return node;
    }

    return getScrollParent(node.parentNode) || document.body;
}

export default class GhScrollTrigger extends Component {
    @service inViewport;

    @action
    setupInViewport(element) {
        this.loaderElement = element;

        let viewportTolerance = this.args.triggerOffset || {};

        // if triggerOffset is a number we use it for all dimensions
        if (typeof viewportTolerance === 'number') {
            viewportTolerance = {
                top: viewportTolerance,
                bottom: viewportTolerance,
                left: viewportTolerance,
                right: viewportTolerance
            };
        }

        let options = {
            viewportSpy: true,
            viewportTolerance,
            scrollableArea: this.args.scrollable || getScrollParent(element)
        };

        let {onEnter, onExit} = this.inViewport.watchElement(element, options);

        onEnter(this.didEnterViewport.bind(this));
        onExit(this.didExitViewport.bind(this));

        this.args.registerElement?.(element);
    }

    didEnterViewport() {
        this.args.enter?.();
    }

    didExitViewport() {
        this.args.exit?.();
    }

    @action
    teardownInViewport(element) {
        this.inViewport.stopWatching(element);
    }
}
