import {helper} from '@ember/component/helper';

export const DEFAULT_QUERY_PARAMS = {
    posts: {
        type: null,
        visibility: null,
        author: null,
        tag: null,
        order: null
    },
    pages: {
        type: null,
        visibility: null,
        author: null,
        tag: null,
        order: null
    },
    'members.index': {
        label: null,
        paid: null,
        search: null,
        filter: null,
        order: null
    },
    'members-activity': {
        excludedEvents: null,
        member: null
    },
    'settings.history': {
        excludedEvents: null,
        excludedResources: null,
        user: null
    }
};

// in order to reset query params to their defaults when using <LinkTo> or
// `transitionTo` it's necessary to explicitly set each param. This helper makes
// it easier to provide a "resetting" link, especially when used with custom views

export function resetQueryParams(routeName, newParams) {
    return Object.assign({}, DEFAULT_QUERY_PARAMS[routeName], newParams);
}

export default helper(function (params/*, hash*/) {
    return resetQueryParams(...params);
});
