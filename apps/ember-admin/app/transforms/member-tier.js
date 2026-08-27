import MemberTier from 'ghost-admin/models/member-tier';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default class MemberTierTransform extends Transform {
    deserialize(serialized) {
        let subscriptions, subscriptionArray;

        subscriptionArray = serialized || [];

        subscriptions = subscriptionArray.map(itemDetails => MemberTier.create(itemDetails));

        return emberA(subscriptions);
    }

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
}
