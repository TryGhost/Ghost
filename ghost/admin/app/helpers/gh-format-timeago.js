import Ember from 'ember';

const {Helper} = Ember;

export function timeAgo(params) {
    if (!params || !params.length) {
        return;
    }
    let [timeago] = params;
    let utc = moment.utc();

    return moment(timeago).from(utc);
}

export default Helper.helper(function (params) {
    return timeAgo(params);
    // stefanpenner says cool for small number of timeagos.
    // For large numbers moment sucks => single Ember.Object based clock better
    // https://github.com/manuelmitasch/ghost-admin-ember-demo/commit/fba3ab0a59238290c85d4fa0d7c6ed1be2a8a82e#commitcomment-5396524
});
