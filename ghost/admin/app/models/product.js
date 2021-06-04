import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'product',

    name: attr('string'),
    description: attr('string'),
    slug: attr('string'),
    monthlyPrice: attr('stripe-price'),
    yearlyPrice: attr('stripe-price')
});
