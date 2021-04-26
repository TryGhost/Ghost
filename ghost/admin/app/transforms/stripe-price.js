import StripePrice from 'ghost-admin/models/stripe-price';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized = []) {
        const stripePrices = serialized.map(itemDetails => StripePrice.create(itemDetails));

        return emberA(stripePrices);
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
