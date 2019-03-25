/* eslint-disable max-statements-per-line */
import {Response} from 'ember-cli-mirage';

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
