import Ember from 'ember';

const {
    Mixin,
    A: emberA,
    RSVP: {reject}
} = Ember;

export default Mixin.create({
    hasValidated: emberA(),

    save(options) {
        let {_super} = this;

        options = options || {};

        return this.validate().then(({validations}) => {
            this.get('hasValidated').pushObjects(Object.keys(this.get('validations._validators')));

            if (validations.get('isValid')) {
                return _super.call(this, options);
            }

            return reject();
        });
    }
});
