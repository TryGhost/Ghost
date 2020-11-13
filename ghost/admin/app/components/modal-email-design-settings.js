import ModalComponent from 'ghost-admin/components/modal-base';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    config: service(),
    settings: service(),

    showHeader: true,
    showSansSerif: false,
    showBadge: true,
    footerText: '',

    init() {
        this._super(...arguments);
    },

    actions: {
        toggleShowHeader(showHeader) {
            this.settings.set('newsletterShowHeader', showHeader);
        },

        setTypography(typography) {
            if (typography === 'serif') {
                this.settings.set('newsletterBodyFontCategory', 'serif');
            } else {
                this.settings.set('newsletterBodyFontCategory', 'sans_serif');
            }
        },

        toggleBadge(showBadge) {
            this.settings.set('newsletterShowBadge', showBadge);
        },

        confirm() {
            return this.saveTask.perform();
        },

        leaveSettings() {
            this.closeModal();
        }
    },

    saveTask: task(function* () {
        yield this.settings.save();
        this.closeModal();
    }).drop()
});
