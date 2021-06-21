import ProductBenefitItem from '../models/product-benefit-item';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized, options) {
        let benefitsItems, benefitsArray;

        try {
            benefitsArray = JSON.parse(serialized) || [];
        } catch (e) {
            benefitsArray = [];
        }

        benefitsItems = benefitsArray.map((itemDetails) => {
            itemDetails.isSecondary = options && options.isSecondary || false;
            return ProductBenefitItem.create(itemDetails);
        });

        return emberA(benefitsItems);
    },

    serialize(deserialized) {
        let benefitsArray;

        if (isEmberArray(deserialized)) {
            benefitsArray = deserialized.map((item) => {
                let label = item.get('label').trim();
                return {label};
            }).compact();
        } else {
            benefitsArray = [];
        }

        return JSON.stringify(benefitsArray);
    }
});
