import $ from 'jquery';
import Component from '@ember/component';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';

export default Component.extend({

    height: 0,
    photo: null,
    tagName: '',
    width: 1200,
    zoomed: false,

    // closure actions
    select() {},
    zoom() {},

    style: computed('zoomed', function () {
        return htmlSafe(this.zoomed ? 'width: auto; margin: 0;' : '');
    }),

    // avoid "binding style attributes" warnings
    containerStyle: computed('photo.color', 'zoomed', function () {
        let styles = [];
        let ratio = this.get('photo.ratio');
        let zoomed = this.zoomed;

        styles.push(`background-color: ${this.get('photo.color')}`);

        if (zoomed) {
            styles.push(`cursor: zoom-out`);
        } else {
            styles.push(`padding-bottom: ${ratio * 100}%`);
        }

        return htmlSafe(styles.join('; '));
    }),

    imageUrl: computed('photo.urls.regular', function () {
        let url = this.get('photo.urls.regular');

        url = url.replace('&w=1080', '&w=1200');

        return url;
    }),

    didReceiveAttrs() {
        this._super(...arguments);

        this.set('height', this.width * this.photo.ratio);

        if (this.zoomed && !this._zoomed) {
            this._setZoomedSize();
        }
        this._zoomed = this.zoomed;

        if (this.zoomed && !this._resizeHandler) {
            this._setupResizeHandler();
        } else if (!this.zoomed && this._resizeHandler) {
            this._teardownResizeHandler();
        }
    },

    didInsertElement() {
        this._super(...arguments);
        this._hasRendered = true;
        if (this.zoomed) {
            this._setZoomedSize();
        }
    },

    willDestroyElement() {
        this._super(...arguments);
        this._teardownResizeHandler();
    },

    actions: {
        select(event) {
            event.preventDefault();
            event.stopPropagation();
            this.select(this.photo);
        },

        zoom(event) {
            let $target = $(event.target);

            // only zoom when it wasn't one of the child links clicked
            if (!$target.is('a') && $target.closest('a').hasClass('gh-unsplash-photo')) {
                event.preventDefault();
                this.zoom(this.photo);
            }

            // don't propagate otherwise we can trigger the closeZoom action on the overlay
            event.stopPropagation();
        }
    },

    _setZoomedSize() {
        if (!this._hasRendered) {
            return false;
        }

        let a = document.querySelector(`[data-unsplash-zoomed-photo="${this.photo.id}"]`);

        a.style.width = '100%';
        a.style.height = '100%';

        let offsets = a.getBoundingClientRect();
        let ratio = this.photo.ratio;

        let maxHeight = {
            width: offsets.height / ratio,
            height: offsets.height
        };

        let maxWidth = {
            width: offsets.width,
            height: offsets.width * ratio
        };

        let usableSize = null;

        if (ratio <= 1) {
            usableSize = maxWidth.height > offsets.height ? maxHeight : maxWidth;
        } else {
            usableSize = maxHeight.width > offsets.width ? maxWidth : maxHeight;
        }

        a.style.width = `${usableSize.width}px`;
        a.style.height = `${usableSize.height}px`;
    },

    _setupResizeHandler() {
        if (this._resizeHandler) {
            return;
        }

        this._resizeHandler = run.bind(this, this._handleResize);
        window.addEventListener('resize', this._resizeHandler);
    },

    _teardownResizeHandler() {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
    },

    _handleResize() {
        this._throttleResize = run.throttle(this, this._setZoomedSize, 100);
    }

});
