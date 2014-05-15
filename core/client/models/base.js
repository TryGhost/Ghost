import ghostPaths from 'ghost/utils/ghost-paths';

var BaseModel = Ember.Object.extend({

    fetch: function () {
        return ic.ajax.request(this.url, {
            type: 'GET'
        });
    },

    save: function () {
        return ic.ajax.request(this.url, {
            type: 'PUT',
            dataType: 'json',
            // @TODO: This is passing _oldWillDestory and _willDestroy and should not.
            data: JSON.stringify(this.getProperties(Ember.keys(this)))
        });
    }
});

BaseModel.apiRoot = ghostPaths().apiRoot;
BaseModel.subdir = ghostPaths().subdir;
BaseModel.adminRoot = ghostPaths().adminRoot;

export default BaseModel;