import Ember from 'ember';

export function readPath(params) {
    var [obj, path] = params;

    return Ember.get(obj, path);
}

export default Ember.Helper.helper(function (params) {
    return readPath(params);
});
