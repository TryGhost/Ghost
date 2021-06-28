import ProductBenefitItem from '../models/product-benefit-item';
import Transform from '@ember-data/serializer/transform';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

export default Transform.extend({
    deserialize(serialized, options) {
        let benefitsItems, benefitsArray;

        benefitsArray = serialized || [];

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
                let name = item.get('name').trim();
                return {name};
            }).compact();
        } else {
            benefitsArray = [];
        }

        return benefitsArray;
    }
});
