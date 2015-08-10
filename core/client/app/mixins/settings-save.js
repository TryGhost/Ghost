import Ember from 'ember';

export default Ember.Mixin.create({
    submitting: false,

    actions: {
        save: function () {
            var self = this;

            this.set('submitting', true);

            this.save().then(function () {
                self.set('submitting', false);
            });
        }
    }
});
