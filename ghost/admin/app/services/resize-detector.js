import Service from '@ember/service';
import classic from 'ember-classic-decorator';
import erd from 'element-resize-detector';

@classic
export default class ResizeDetectorService extends Service {
    init() {
        super.init(...arguments);
        this.detector = erd({
            strategy: 'scroll'
        });
    }

    setup(selector, callback) {
        let element = document.querySelector(selector);
        if (!element) {
            // eslint-disable-next-line
            console.error(`service:resize-detector - could not find element matching ${selector}`);
        }
        this.detector.listenTo(element, callback);
    }

    teardown(selector, callback) {
        let element = document.querySelector(selector);
        if (element) {
            this.detector.removeListener(element, callback);
        }
    }
}
