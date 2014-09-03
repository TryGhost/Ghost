var ModalDialog = Ember.Component.extend({
    didInsertElement: function () {
        this.$('.js-modal-container').fadeIn(50);

        this.$('.js-modal-background').show().fadeIn(10, function () {
            $(this).addClass('in');
        });

        this.$('.js-modal').addClass('in');
    },

    willDestroyElement: function () {

        this.$('.js-modal').removeClass('in');

        this.$('.js-modal-background').removeClass('in');

        return this._super();
    },

    confirmaccept: 'confirmAccept',
    confirmreject: 'confirmReject',

    actions: {
        closeModal: function () {
            this.sendAction();
        },
        confirm: function (type) {
            this.sendAction('confirm' + type);
            this.sendAction();
        }
    },

    klass: Ember.computed('type', 'style', 'animation', function () {
        var classNames = [];

        classNames.push(this.get('type') ? 'modal-' + this.get('type') : 'modal');

        if (this.get('style')) {
            this.get('style').split(',').forEach(function (style) {
                classNames.push('modal-style-' + style);
            });
        }

        classNames.push(this.get('animation'));

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
