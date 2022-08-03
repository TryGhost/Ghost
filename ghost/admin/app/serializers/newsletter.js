/* eslint-disable camelcase */
import ApplicationSerializer from './application';

export default class MemberSerializer extends ApplicationSerializer {
    // HACK: Ember Data doesn't expose `meta` properties consistently
    //  - https://github.com/emberjs/data/issues/2905
    //
    // We need the `meta` data returned when saving so we extract it and dump
    // it onto the model as an attribute then delete it again when serializing.
    normalizeResponse() {
        const json = super.normalizeResponse(...arguments);

        if (json.meta && json.data.attributes) {
            json.data.attributes._meta = json.meta;
        }

        return json;
    }

    serialize() {
        const json = super.serialize(...arguments);

        delete json._meta;

        return json;
    }
}
