/* eslint-disable max-statements-per-line */
import {Response} from 'ember-cli-mirage';

export function paginatedResponse(modelName) {
    return function (schema, request) {
        let page = +request.queryParams.page || 1;
        let limit = +request.queryParams.limit || 15;
        let allModels = this.serialize(schema[modelName].all())[modelName];

        return paginateModelArray(modelName, allModels, page, limit);
    };
}

export function paginateModelArray(modelName, allModels, page, limit) {
    let pages, next, prev, models;

    if (limit === 'all') {
        pages = 1;
    } else {
        limit = +limit;

        let start = (page - 1) * limit;
        let end = start + limit;

        pages = Math.ceil(allModels.length / limit);
        models = allModels.slice(start, end);

        if (start > 0) {
            prev = page - 1;
        }

        if (end < allModels.length) {
            next = page + 1;
        }
    }

    return {
        meta: {
            pagination: {
                page,
                limit,
                pages,
                total: allModels.length,
                next: next || null,
                prev: prev || null
            }
        },
        [modelName]: models || allModels
    };
}

export function maintenanceResponse() {
    return new Response(503, {}, {
        errors: [{
            errorType: 'Maintenance'
        }]
    });
}

export function versionMismatchResponse() {
    return new Response(400, {}, {
        errors: [{
            errorType: 'VersionMismatchError'
        }]
    });
}
