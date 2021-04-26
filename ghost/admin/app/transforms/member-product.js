import MemberProduct from 'ghost-admin/models/member-product';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized) {
        let subscriptions, subscriptionArray;

        subscriptionArray = serialized || [];

        subscriptions = subscriptionArray.map(itemDetails => MemberProduct.create(itemDetails));

        return emberA(subscriptions);
    },

    serialize(deserialized) {
        let subscriptionArray;

        if (isEmberArray(deserialized)) {
            subscriptionArray = deserialized.map((item) => {
                return item;
            }).compact();
        } else {
            subscriptionArray = [];
        }

        return subscriptionArray;
    }
});

