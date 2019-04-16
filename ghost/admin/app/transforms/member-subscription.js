import MemberSubscription from 'ghost-admin/models/member-subscription';
import Transform from 'ember-data/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized) {
        let subscriptions, subscriptionArray;

        subscriptionArray = serialized || [];

        subscriptions = subscriptionArray.map(itemDetails => MemberSubscription.create(itemDetails));

        return emberA(subscriptions);
    },

    serialize(deserialized) {
        let subscriptionArray;

        if (isEmberArray(deserialized)) {
            subscriptionArray = deserialized.map((item) => {
                let adapter = item.get('adapter').trim();
                let amount = item.get('amount');
                let plan = item.get('plan').trim();
                let status = item.get('status').trim();
                let validUntil = item.get('validUntil');

                return {adapter, amount, plan, status, validUntil};
            }).compact();
        } else {
            subscriptionArray = [];
        }

        return subscriptionArray;
    }
});
