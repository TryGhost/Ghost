import Ember from 'ember';

export function isNot(params/*, hash*/) {
    return !params;
}

export default Ember.HTMLBars.makeBoundHelper(isNot);
