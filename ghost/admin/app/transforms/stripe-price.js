import StripePrice from 'ghost-admin/models/stripe-price';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized) {
        if (serialized === null || serialized === undefined) {
            return null;
        } else if (Array.isArray(serialized)) {
            const stripePrices = serialized.map(itemDetails => StripePrice.create(itemDetails));

            return emberA(stripePrices);
        } else {
            return StripePrice.create(serialized);
        }
    },

    serialize(deserialized) {
        if (isEmberArray(deserialized)) {
            return deserialized.map((item) => {
                return item;
            }).compact();
        } else {
            return deserialized || null;
        }
    }
});
