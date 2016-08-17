import Mirage from 'ember-cli-mirage';

export function paginatedResponse(modelName, allModels, request) {
    let page = +request.queryParams.page || 1;
    let limit = request.queryParams.limit || 15;
    let pages, models, next, prev;

    allModels = allModels || [];

    if (limit === 'all') {
        models = allModels;
        pages = 1;
    } else {
        limit = +limit;

        let start = (page - 1) * limit;
        let end = start + limit;

        models = allModels.slice(start, end);
        pages = Math.ceil(allModels.length / limit);

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
        [modelName]: models
    };
}

export function maintenanceResponse() {
    return new Mirage.Response(503, {}, {
        errors: [{
            errorType: 'Maintenance'
        }]
    });
}

export function versionMismatchResponse() {
    return new Mirage.Response(400, {}, {
        errors: [{
            errorType: 'VersionMismatchError'
        }]
    });
}
