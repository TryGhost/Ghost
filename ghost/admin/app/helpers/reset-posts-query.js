import {helper} from '@ember/component/helper';

// in order to reset query params to their defaults when using <LinkTo> it's
// necessary to explicitly set each param. This helper makes it easier to
// provide a "resetting" link, especially when used with custom views

export default helper(function resetPostsQuery(params/*, hash*/) {
    let resetQuery = {
        type: null,
        author: null,
        tag: null,
        order: null
    };

    if (params[0]) {
        Object.assign(resetQuery, params[0]);
    }

    return resetQuery;
});
