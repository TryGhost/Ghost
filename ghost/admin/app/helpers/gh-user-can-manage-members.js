import {helper} from '@ember/component/helper';

// e.g - {{#if (gh-user-can-manage-members session.user)}} 'block content' {{/if}}
// @param session.user

export function ghUserCanManageMembers(params) {
    return !!(params[0].get('canManageMembers'));
}

export default helper(function (params) {
    return ghUserCanManageMembers(params);
});