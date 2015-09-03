import Ember from 'ember';

export function readPath(params/*, hash*/) {
    var [obj, path] = params;

    return Ember.get(obj, path);
}

export default Ember.HTMLBars.makeBoundHelper(readPath);
