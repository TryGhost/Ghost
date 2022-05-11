import ApplicationSerializer from './application';

export default class TierSerializer extends ApplicationSerializer {
    serialize() {
        let json = super.serialize(...arguments);

        if (json?.monthly_price?.amount) {
            json.monthly_price.amount = Math.round(json.monthly_price.amount);
        }

        if (json?.yearly_price?.amount) {
            json.yearly_price.amount = Math.round(json.yearly_price.amount);
        }

        return json;
    }
}
