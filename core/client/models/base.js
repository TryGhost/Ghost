
function ghostPaths() {
    var path = window.location.pathname,
        subdir = path.substr(0, path.search('/ghost/'));

    return {
        subdir: subdir,
        adminRoot: subdir + '/ghost',
        apiRoot: subdir + '/ghost/api/v0.1'
    };
}

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