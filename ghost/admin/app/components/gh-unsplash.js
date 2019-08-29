/* global key */
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

    shortcuts: null,
    tagName: '',
    zoomedPhoto: null,
    searchTerm: null,

    // closure actions
    close() {},
    select() {},

    sideNavHidden: or('ui.{isFullScreen,showMobileMenu}'),

    init() {
        this._super(...arguments);

        this.shortcuts = {
            escape: {action: 'handleEscape', scope: 'all'}
        };
    },

    didReceiveAttrs() {
        this._super(...arguments);

        if (this.searchTerm !== this._searchTerm) {
            this.unsplash.updateSearch(this.searchTerm);
        }

        this._searchTerm = this.searchTerm;
    },

    didInsertElement() {
        this._super(...arguments);
        this._resizeCallback = bind(this, this._handleResize);
        this.resizeDetector.setup('[data-unsplash]', this._resizeCallback);
        this.registerShortcuts();
    },

    willDestroyElement() {
        this.resizeDetector.teardown('[data-unsplash]', this._resizeCallback);
        this.removeShortcuts();
        this.send('resetKeyScope');
        this._super(...arguments);
    },

    actions: {
        loadNextPage() {
            this.unsplash.loadNextPage();
        },

        search(term) {
            this.unsplash.updateSearch(term);
            this.send('closeZoom');
        },

        zoomPhoto(photo) {
            this.set('zoomedPhoto', photo);
        },

        closeZoom() {
            this.set('zoomedPhoto', null);
        },

        select(photo) {
            this.unsplash.triggerDownload(photo);

            let selectParams = {
                src: photo.urls.regular.replace(/&w=1080/, '&w=2000'),
                alt: photo.description || '',
                caption: `Photo by <a href="${photo.user.links.html}?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit">${photo.user.name}</a> / <a href="https://unsplash.com/?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit">Unsplash</a>`
            };
            this.select(selectParams);

            this.close();
        },

        close() {
            this.close();
        },

        retry() {
            this.unsplash.retryLastRequest();
        },

        setKeyScope() {
            key.setScope('unsplash');
        },

        resetKeyScope() {
            key.setScope('default');
        },

        handleEscape() {
            if (this.zoomedPhoto) {
                return this.send('closeZoom');
            }

            this.close();
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

        this.unsplash.changeColumnCount(columns);
    }
});
