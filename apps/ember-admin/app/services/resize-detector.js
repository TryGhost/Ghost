import Service from '@ember/service';
import erd from 'element-resize-detector';

export default class ResizeDetectorService extends Service {
    constructor() {
        super(...arguments);
        this.detector = erd({
            strategy: 'scroll'
        });
    }

    setup(selectorOrElement, callback) {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;

        if (!element) {
            // eslint-disable-next-line
            console.error(`service:resize-detector - could not find element matching ${selectorOrElement}`);
        }

        this.detector.listenTo(element, callback);
    }

    teardown(selectorOrElement, callback) {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;

        if (element) {
            this.detector.removeListener(element, callback);
        }
    }
}
