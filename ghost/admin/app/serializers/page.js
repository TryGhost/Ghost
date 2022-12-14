import PostSerializer from './post';

export default class Page extends PostSerializer {
    serialize() {
        let json = super.serialize(...arguments);

        // Properties that exist on the model but we don't want sent in the payload
        delete json.email_subject;
        delete json.send_email_when_published;
        delete json.email_recipient_filter;
        delete json.email_only;
        delete json.email_id;
        delete json.email;

        if (json.visibility === null) {
            delete json.visibility;
            delete json.visibility_filter;
            delete json.tiers;
        }

        if (json.visibility === 'tiers') {
            delete json.visibility_filter;
        }

        if (json.visibility === 'tiers' && !json.tiers?.length) {
            delete json.visibility;
            delete json.tiers;
        }

        return json;
    }
}
