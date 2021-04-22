import StripePrice from 'ghost-admin/models/stripe-price';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized = []) {
        return emberA(serialized.map(StripePrice.create.bind(StripePrice)));
    },

    serialize(deserialized) {
        if (isEmberArray(deserialized)) {
            return deserialized.map((item) => {
                return item;
            }).compact();
        } else {
            return [];
        }
    }
});
