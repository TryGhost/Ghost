
function ghostPaths() {
    var path = window.location.pathname,
        subdir = path.substr(0, path.search('/ghost/'));

    return {
        subdir: subdir,
        apiRoot: subdir + '/ghost/api/v0.1'
    };
}

var BaseModel = Ember.Object.extend({
});

BaseModel.apiRoot = ghostPaths().apiRoot;
BaseModel.subdir = ghostPaths().subdir;

export default BaseModel;