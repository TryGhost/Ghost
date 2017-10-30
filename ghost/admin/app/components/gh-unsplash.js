import Component from '@ember/component';
import ShortcutsMixin from 'ghost-admin/mixins/shortcuts';
import {bind} from '@ember/runloop';
import {or} from '@ember/object/computed';
import {inject as service} from '@ember/service';

const ONE_COLUMN_WIDTH = 540;
const TWO_COLUMN_WIDTH = 940;

export default Component.extend(ShortcutsMixin, {
    resizeDetector: service(),
    unsplash: service(),
    ui: service(),

    tagName: '',
    zoomedPhoto: null,

    shortcuts: {
        escape: 'handleEscape'
    },

    // closure actions
    close() {},
    insert() {},

    sideNavHidden: or('ui.{autoNav,isFullScreen,showMobileMenu}'),

    didInsertElement() {
        this._super(...arguments);
        this._resizeCallback = bind(this, this._handleResize);
        this.get('resizeDetector').setup('.gh-unsplash', this._resizeCallback);
        this.registerShortcuts();
    },

    willDestroyElement() {
        this._super(...arguments);
        this.get('resizeDetector').teardown('.gh-unsplash', this._resizeCallback);
        this.removeShortcuts();
    },

    actions: {
        loadNextPage() {
            this.get('unsplash').loadNextPage();
        },

        zoomPhoto(photo) {
            this.set('zoomedPhoto', photo);
        },

        closeZoom() {
            this.set('zoomedPhoto', null);
        },

        insert(photo) {
            this.insert(photo);
            this.close();
        },

        close() {
            this.close();
        },

        retry() {
            this.get('unsplash').retryLastRequest();
        },

        handleEscape() {
            if (!this.get('zoomedPhoto')) {
                this.close();
            }
        }
    },

    _handleResize(element) {
        let width = element.clientWidth;
        let columns = 3;

        if (width <= ONE_COLUMN_WIDTH) {
            columns = 1;
        } else if (width <= TWO_COLUMN_WIDTH) {
            columns = 2;
        }

        this.get('unsplash').changeColumnCount(columns);
    }
});
