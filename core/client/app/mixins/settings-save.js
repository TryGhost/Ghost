import Ember from 'ember';

const {Mixin} = Ember;

export default Mixin.create({
    submitting: false,

    actions: {
        save() {
            this.set('submitting', true);

            this.save().finally(() => {
                this.set('submitting', false);
            });
        }
    }
});
