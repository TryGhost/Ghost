import ProductBenefitItem from '../models/product-benefit-item';
import Transform from '@ember-data/serializer/transform';
import classic from 'ember-classic-decorator';
import {A as emberA, isArray as isEmberArray} from '@ember/array';

@classic
export default class ProductBenefits extends Transform {
    deserialize(serialized) {
        let benefitsItems, benefitsArray;

        benefitsArray = serialized || [];

        benefitsItems = benefitsArray.map((itemDetails) => {
            return ProductBenefitItem.create(itemDetails);
        });

        return emberA(benefitsItems);
    }

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
}
