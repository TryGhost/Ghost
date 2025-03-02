import {helper} from '@ember/component/helper';

// Handlebars Helper {{gh-user-can-manage-members}} group users by admin and owner using if, or group them author using unless
// Usage: call helper as with aparameter of session.user
// e.g - {{#if (gh-user-can-manage-members session.user)}} 'block content' {{/if}}
// @param session.user

export function ghUserCanManageMembers(params) {
    console.log('check if user can manage members', params[0]);
    return !!(params[0].get('isAdmin')) || !!(params[0].get('isEditor'));
}

export default helper(function (params) {
    return ghUserCanManageMembers(params);
});
