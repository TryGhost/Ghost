import BaseModel from 'ghost/models/base';

var PostModel = BaseModel.extend({
    url: BaseModel.apiRoot + '/posts/',

    generateSlug: function () {
        // @TODO Make this request use this.get('title') once we're an actual user
        var url = this.get('url') + 'slug/' + encodeURIComponent('test title') + '/';
        return ic.ajax.request(url, {
            type: 'GET'
        });
    },

    save: function (properties) {
        var url = this.url,
            self = this,
            type,
            validationErrors = this.validate();

        if (validationErrors.length) {
            return Ember.RSVP.Promise(function (resolve, reject) {
                return reject(validationErrors);
            });
        }

        //If specific properties are being saved,
        //this is an edit. Otherwise, it's an add.
        if (properties && properties.length > 0) {
            type = 'PUT';
            url += this.get('id');
        } else {
            type = 'POST';
            properties = Ember.keys(this);
        }

        return ic.ajax.request(url, {
            type: type,
            data: this.getProperties(properties)
        }).then(function (model) {
            return self.setProperties(model);
        });
    },
    validate: function () {
        var validationErrors = [];

        if (!(this.get('title') && this.get('title').length)) {
            validationErrors.push({
                message: "You must specify a title for the post."
            });
        }

        return validationErrors;
    }
});

export default PostModel;