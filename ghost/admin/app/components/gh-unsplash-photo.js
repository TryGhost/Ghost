import Component from '@glimmer/component';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {tracked} from '@glimmer/tracking';

export default class GhUnsplashPhoto extends Component {
    @tracked height = 0;
    @tracked width = 1200;

    // Overlay button selectors for touch device handling
    static OVERLAY_BUTTON_SELECTORS = [
        '.gh-unsplash-button-likes',
        '.gh-unsplash-button-download',
        '.gh-unsplash-photo-author'
    ];

    get style() {
        return htmlSafe(this.args.zoomed ? 'width: auto; margin: 0;' : '');
    }

    // avoid "binding style attributes" warnings
    get containerStyle() {
        const styles = [];
        const ratio = this.args.photo.ratio;
        const zoomed = this.args.zoomed;

        styles.push(`background-color: ${this.args.photo.color}`);

        if (zoomed) {
            styles.push(`cursor: zoom-out`);
        } else {
            styles.push(`padding-bottom: ${ratio * 100}%`);
        }

        return htmlSafe(styles.join('; '));
    }

    get imageUrl() {
        let url = this.args.photo.urls.regular;

        url = url.replace('&w=1080', '&w=1200');

        return url;
    }

    constructor() {
        super(...arguments);
        this.height = this.width * this.args.photo.ratio;
    }

    @action
    select(event) {
        event.preventDefault();
        event.stopPropagation();
        this.args.select(this.args.photo);
    }

    @action
    zoom(event) {
        const {target} = event;
        const isOverlayButtonClick = GhUnsplashPhoto.OVERLAY_BUTTON_SELECTORS.some(selector => target.closest(selector));
        const isMobileViewport = window.matchMedia('(max-width: 540px)').matches;
        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        const shouldNotZoom = isMobileViewport || isTouchDevice;

        if (shouldNotZoom && isOverlayButtonClick) {
            return;
        }

        if (shouldNotZoom) {
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // only zoom when it wasn't one of the child links clicked
        if (!target.matches('a') && target.closest('a').classList.contains('gh-unsplash-photo')) {
            event.preventDefault();
            this.args.zoom(this.args.photo);
        }

        // don't propagate otherwise we can trigger the closeZoom action on the overlay
        event.stopPropagation();
    }
}
