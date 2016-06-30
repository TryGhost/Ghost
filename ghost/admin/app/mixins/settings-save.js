import Mixin from 'ember-metal/mixin';

export default Mixin.create({
    submitting: false,

    actions: {
        save() {
            this.set('submitting', true);

            this.save().then(() => {
                this.set('submitting', false);
            });
        }
    }
});
