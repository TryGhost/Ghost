import HashLocation from '@ember/routing/hash-location';
import {inject as service} from '@ember/service';

let trailingHash = HashLocation.extend({
    unsavedChanges: service('unsaved-changes'),

    formatURL() {
        let url = this._super(...arguments);

        if (url.indexOf('?') > 0) {
            return url.replace(/([^/])\?/, '$1/?');
        } else {
            return url.replace(/\/?$/, '/');
        }
    },

    init() {
        this._super(...arguments);

        this._clickHandler = (event) => {
            if (!this.unsavedChanges.isDirty) {
                return;
            }

            // Don't intercept modified clicks (Cmd/Ctrl-click, middle-click)
            // to preserve expected new-tab/new-window browser behavior
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                return;
            }

            let target = event.target.closest?.('a[href^="#/"]');
            if (!target) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            let href = target.getAttribute('href');

            this.unsavedChanges.confirmLeave().then((confirmed) => {
                if (confirmed) {
                    window.location.hash = href;
                }
            });
        };

        document.addEventListener('click', this._clickHandler, true);
    },

    willDestroy() {
        this._super(...arguments);

        if (this._clickHandler) {
            document.removeEventListener('click', this._clickHandler, true);
        }
    }
});

export default {
    name: 'registerTrailingHashLocation',

    initialize(application) {
        application.register('location:trailing-hash', trailingHash);
    }
};
