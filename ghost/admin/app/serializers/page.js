import PostSerializer from './post';

export default PostSerializer.extend({
    serialize(/*snapshot, options*/) {
        let json = this._super(...arguments);

        // Properties that exist on the model but we don't want sent in the payload
        delete json.email_subject;
        delete json.send_email_when_published;
        delete json.email_recipient_filter;
        delete json.email_only;
        delete json.email_id;
        delete json.email;

        return json;
    }
});
