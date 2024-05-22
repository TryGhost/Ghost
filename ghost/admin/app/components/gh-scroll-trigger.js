import Component from '@glimmer/component';
import getScrollParent from '../utils/get-scroll-parent';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
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
