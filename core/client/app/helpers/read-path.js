import Ember from 'ember';

const {Helper, get} = Ember;

export function readPath(params) {
    let [obj, path] = params;

    return get(obj, path);
}

export default Helper.helper(function (params) {
    return readPath(params);
});
