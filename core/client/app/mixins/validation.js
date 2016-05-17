import Ember from 'ember';

const {
    Mixin,
    A: emberA,
    RSVP: {resolve, reject}
} = Ember;

export default Mixin.create({
    hasValidated: emberA(),

    validate() {
        return this.get('validations').validate(...arguments).then(({validations}) => {
            this.get('hasValidated').pushObjects(validations.get('content').getEach('attribute'));

            return (validations.get('isValid')) ? resolve() : reject();
        });
    },

    save(options) {
        let {_super} = this;

        options = options || {};

        return this.validate().then(() => {
            return _super.call(this, options);
        });
    }
});
