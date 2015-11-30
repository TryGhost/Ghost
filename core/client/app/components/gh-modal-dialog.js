import Ember from 'ember';

const {Component, computed} = Ember;

function K() {
    return this;
}

export default Component.extend({

    confirmaccept: 'confirmAccept',
    confirmreject: 'confirmReject',

    klass: computed('type', 'style', function () {
        let classNames = [];

        classNames.push(this.get('type') ? `modal-${this.get('type')}` : 'modal');

        if (this.get('style')) {
            this.get('style').split(',').forEach((style) => {
                classNames.push(`modal-style-${style}`);
            });
        }

        return classNames.join(' ');
    }),

    acceptButtonClass: computed('confirm.accept.buttonClass', function () {
        return this.get('confirm.accept.buttonClass') ? this.get('confirm.accept.buttonClass') : 'btn btn-green';
    }),

    rejectButtonClass: computed('confirm.reject.buttonClass', function () {
        return this.get('confirm.reject.buttonClass') ? this.get('confirm.reject.buttonClass') : 'btn btn-red';
    }),

    didInsertElement() {
        this._super(...arguments);
        this.$('.js-modal-container, .js-modal-background').addClass('fade-in open');
        this.$('.js-modal').addClass('open');
    },

    close() {
        this.$('.js-modal, .js-modal-background').removeClass('fade-in').addClass('fade-out');

        // The background should always be the last thing to fade out, so check on that instead of the content
        this.$('.js-modal-background').on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', (event) => {
            if (event.originalEvent.animationName === 'fade-out') {
                this.$('.js-modal, .js-modal-background').removeClass('open');
            }
        });

        this.sendAction();
    },

    actions: {
        closeModal() {
            this.close();
        },

        confirm(type) {
            this.sendAction(`confirm${type}`);
            this.close();
        },

        noBubble: K
    }
});
