import Ember from 'ember';

export function isEqual(params/*, hash*/) {
    var [lhs, rhs] = params;

    return lhs === rhs;
}

export default Ember.HTMLBars.makeBoundHelper(isEqual);
