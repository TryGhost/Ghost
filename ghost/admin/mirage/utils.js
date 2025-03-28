/* eslint-disable max-statements-per-line */
import {Response} from 'miragejs';
import {isArray} from '@ember/array';

export function paginatedResponse(modelName) {
    return function (schema, request) {
        let page = +request.queryParams.page || 1;
        let limit = request.queryParams.limit;
        let collection = schema[modelName].all();

        if (limit !== 'all') {
            limit = +request.queryParams.limit || 15;
        }

        return paginateModelCollection(modelName, collection, page, limit);
    };
}

export function paginateModelCollection(modelName, collection, page, limit) {
    let pages, next, prev, models;

    if (limit === 'all') {
        pages = 1;
    } else {
        limit = +limit;

        let start = (page - 1) * limit;
        let end = start + limit;

        pages = Math.ceil(collection.models.length / limit);
        models = collection.models.slice(start, end);

        if (start > 0) {
            prev = page - 1;
        }

        if (end < collection.models.length) {
            next = page + 1;
        }
    }

    collection.meta = {
        pagination: {
            page,
            limit,
            pages,
            total: collection.models.length,
            next: next || null,
            prev: prev || null
        }
    };

    if (models) {
        collection.models = models;
    }

    return collection;
}

export function maintenanceResponse() {
    return new Response(503, {}, {
        errors: [{
            type: 'Maintenance'
        }]
    });
}

export function versionMismatchResponse() {
    return new Response(400, {}, {
        errors: [{
            type: 'VersionMismatchError'
        }]
    });
}

function normalizeBooleanParams(arr) {
    if (!isArray(arr)) {
        return arr;
    }

    return arr.map((i) => {
        if (i === 'true') {
            return true;
        } else if (i === 'false') {
            return false;
        } else {
            return i;
        }
    });
}

function normalizeStringParams(arr) {
    if (!isArray(arr)) {
        return arr;
    }

    return arr.map((i) => {
        if (!i.replace) {
            return i;
        }

        return i.replace(/^['"]|['"]$/g, '');
    });
}

// TODO: use GQL to parse filter string?
export function extractFilterParam(param, filter = '') {
    let filterRegex = new RegExp(`${param}:(.*?)(?:\\+|$)`);
    let match;

    let [, result] = filter.match(filterRegex) || [];

    if (!result) {
        return;
    }

    if (result.startsWith('[')) {
        match = result.replace(/^\[|\]$/g, '').split(',');
    } else {
        match = [result];
    }

    return normalizeBooleanParams(normalizeStringParams(match));
}

export function hasInvalidPermissions(allowedRoles) {
    const {schema, request} = this;

    // always allow dev requests through - the logged in user will be real so
    // we can't check against it in the mocked db
    if (!request.requestHeaders['X-Test-User']) {
        return false;
    }

    const invalidPermsResponse = new Response(403, {}, {
        errors: [{
            type: 'NoPermissionError',
            message: 'You do not have permission to perform this action'
        }]
    });

    const user = schema.users.find(request.requestHeaders['X-Test-User']);
    const adminRoles = user.roles.filter(role => allowedRoles.includes(role.name));

    if (adminRoles.length === 0) {
        return invalidPermsResponse;
    }
}

export function withPermissionsCheck(allowedRoles, fn) {
    return function () {
        const boundPermsCheck = hasInvalidPermissions.bind(this);
        const boundFn = fn.bind(this);
        return boundPermsCheck(allowedRoles) || boundFn(...arguments);
    };
}
