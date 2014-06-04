var ModalDialog = Ember.Component.extend({
    didInsertElement: function () {
        this.$('#modal-container').fadeIn(50);

        this.$('.modal-background').show().fadeIn(10, function () {
            $(this).addClass('in');
        });

        this.$('.js-modal').addClass('in');
    },

    willDestroyElement: function () {

        this.$('.js-modal').removeClass('in');

        this.$('.modal-background').removeClass('in');

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

    klass: function () {
        var classNames = [];

        classNames.push(this.get('type') ? 'modal-' + this.get('type') : 'modal');

        if (this.get('style')) {
            this.get('style').split(',').forEach(function (style) {
                classNames.push('modal-style-' + style);
            });
        }

        classNames.push(this.get('animation'));

        return classNames.join(' ');
    }.property('type', 'style', 'animation'),

    acceptButtonClass: function () {
        return this.get('confirm.accept.buttonClass') ? this.get('confirm.accept.buttonClass') : 'button-add';
    }.property('confirm.accept.buttonClass'),

    rejectButtonClass: function () {
        return this.get('confirm.reject.buttonClass') ? this.get('confirm.reject.buttonClass') : 'button-delete';
    }.property('confirm.reject.buttonClass')
});

export default ModalDialog;
