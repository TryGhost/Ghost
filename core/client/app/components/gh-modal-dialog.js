import Ember from 'ember';
var ModalDialog = Ember.Component.extend({
    didInsertElement: function () {
        this.$('.js-modal-container, .js-modal-background').addClass('fade-in open');
        this.$('.js-modal').addClass('open');
    },

    close: function () {
        var self = this;

        this.$('.js-modal, .js-modal-background').removeClass('fade-in').addClass('fade-out');

        // The background should always be the last thing to fade out, so check on that instead of the content
        this.$('.js-modal-background').on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
            if (event.originalEvent.animationName === 'fade-out') {
                self.$('.js-modal, .js-modal-background').removeClass('open');
            }
        });

        this.sendAction();
    },

    confirmaccept: 'confirmAccept',
    confirmreject: 'confirmReject',

    actions: {
        closeModal: function () {
            this.close();
        },
        confirm: function (type) {
            this.sendAction('confirm' + type);
            this.close();
        },
        noBubble: Ember.K
    },

    klass: Ember.computed('type', 'style', function () {
        var classNames = [];

        classNames.push(this.get('type') ? 'modal-' + this.get('type') : 'modal');

        if (this.get('style')) {
            this.get('style').split(',').forEach(function (style) {
                classNames.push('modal-style-' + style);
            });
        }

        return classNames.join(' ');
    }),

    acceptButtonClass: Ember.computed('confirm.accept.buttonClass', function () {
        return this.get('confirm.accept.buttonClass') ? this.get('confirm.accept.buttonClass') : 'btn btn-green';
    }),

    rejectButtonClass: Ember.computed('confirm.reject.buttonClass', function () {
        return this.get('confirm.reject.buttonClass') ? this.get('confirm.reject.buttonClass') : 'btn btn-red';
    })
});

export default ModalDialog;
