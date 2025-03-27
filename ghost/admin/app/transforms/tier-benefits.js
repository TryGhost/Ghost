import TierBenefitItem from '../models/tier-benefit-item';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default class TierBenefits extends Transform {
    deserialize(serialized) {
        let benefitsItems, benefitsArray;

        benefitsArray = serialized || [];

        benefitsItems = benefitsArray.map((itemDetails) => {
            return TierBenefitItem.create({name: itemDetails});
        });

        return emberA(benefitsItems);
    }

    serialize(deserialized) {
        let benefitsArray;

        if (isEmberArray(deserialized)) {
            benefitsArray = deserialized.map((item) => {
                let name = item.get('name').trim();
                return name;
            }).compact();
        } else {
            benefitsArray = [];
        }

        return benefitsArray;
    }
}
