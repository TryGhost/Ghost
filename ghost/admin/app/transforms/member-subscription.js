import MemberSubscription from 'ghost-admin/models/member-subscription';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default class MemberSubscriptionTransform extends Transform {
    deserialize(serialized) {
        let subscriptions, subscriptionArray;

        subscriptionArray = serialized || [];

        subscriptions = subscriptionArray.map(itemDetails => MemberSubscription.create(itemDetails));

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
