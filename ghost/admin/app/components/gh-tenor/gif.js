import Component from '@glimmer/component';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';

export default class GhTenorGifComponent extends Component {
    get media() {
        if (this.args.zoomed) {
            return this.args.gif.media[0].gif;
        } else {
            return this.args.gif.media[0].tinygif;
        }
    }

    get imageUrl() {
        return this.media.url;
    }

    get width() {
        return this.media.dims[0];
    }

    get height() {
        return this.media.dims[1];
    }

    get style() {
        return htmlSafe(this.args.zoomed ? 'width: auto; margin: 0' : '');
    }

    get containerStyle() {
        if (!this.args.gif) {
            return htmlSafe('');
        }

        const styles = [];
        const ratio = this.args.gif.ratio;
        const zoomed = this.args.zoomed;

        if (zoomed) {
            styles.push(`cursor: zoom-out`);
        } else {
            styles.push(`padding-bottom: ${ratio * 100}%`);
        }

        return htmlSafe(styles.join('; '));
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this._teardownResizeHandler();
    }

    @action
    didInsert() {
        this._hasRendered = true;

        if (this.args.zoomed) {
            this._setZoomedSize();
            this._setupResizeHandler();
        }
    }

    // adjust dimensions so that the full gif is visible on-screen no matter it's ratio
    _setZoomedSize() {
        if (!this._hasRendered) {
            return;
        }

        const a = document.querySelector(`[data-tenor-zoomed-gif="${this.args.gif.id}"]`);

        a.style.width = '100%';
        a.style.height = '100%';

        const offsets = a.getBoundingClientRect();
        const ratio = this.args.gif.ratio;

        const maxHeight = {
            width: offsets.height / ratio,
            height: offsets.height
        };

        const maxWidth = {
            width: offsets.width,
            height: offsets.width * ratio
        };

        let usableSize;

        if (ratio <= 1) {
            usableSize = maxWidth.height > offsets.height ? maxHeight : maxWidth;
        } else {
            usableSize = maxHeight.width > offsets.width ? maxWidth : maxHeight;
        }

        a.style.width = `${usableSize.width}px`;
        a.style.height = `${usableSize.height}px`;
    }

    _setupResizeHandler() {
        if (this._resizeHandler) {
            return;
        }

        this._resizeHandler = run.bind(this, this._handleResize);
        window.addEventListener('resize', this._resizeHandler);
    }

    _teardownResizeHandler() {
        window.removeEventListener('resize', this._resizeHandler);
    }

    _handleResize() {
        this._throttleResize = run.throttle(this, this._setZoomedSize, 100);
    }
}
