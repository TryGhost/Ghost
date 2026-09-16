import ApplicationSerializer from './application';

export default class TierSerializer extends ApplicationSerializer {
    serialize() {
        let json = super.serialize(...arguments);

        if (json?.monthly_price) {
            json.monthly_price = Math.round(json.monthly_price);
        }

        if (json?.yearly_price) {
            json.yearly_price = Math.round(json.yearly_price);
        }

        return json;
    }
}
