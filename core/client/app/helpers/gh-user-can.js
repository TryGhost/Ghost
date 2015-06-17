import Ember from 'ember';
// Handlebars Helper {{gh-user-can}}
// Usage: call helper as with first parameter of session.user and second parameter the minimum role
// e.g - {{#if (gh-user-can session.user 'admin')}} 'block content' {{/if}}
// @param1 session.user
// @param2 'admin' or 'editor'

export function ghUserCan(params) {
    if (params[1] === 'admin') {
        return !!(params[0].get('isOwner') || params[0].get('isAdmin'));
    } else if (params[1] === 'editor') {
        return !!(params[0].get('isOwner') || params[0].get('isAdmin') || params[0].get('isEditor'));
    }
    return false;
}

export default Ember.HTMLBars.makeBoundHelper(ghUserCan);
