import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'tier',

    name: attr('string'),
    description: attr('string'),
    active: attr('boolean'),
    slug: attr('string'),
    welcomePageURL: attr('string'),
    visibility: attr('string', {defaultValue: 'none'}),
    type: attr('string', {defaultValue: 'paid'}),
    monthlyPrice: attr('stripe-price'),
    yearlyPrice: attr('stripe-price'),
    benefits: attr('tier-benefits')
});
