import Ember from 'ember';

const {Mixin} = Ember;

export default Mixin.create({
    submitting: false,

    actions: {
        save() {
            return this.save();
        }
    }
});
