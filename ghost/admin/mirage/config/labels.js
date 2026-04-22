import {extractFilterParam, paginateModelCollection} from '../utils';

export default function mockLabels(server) {
    server.post('/labels/');

    server.get('/labels/', function ({labels}, request) {
        let page = +request.queryParams.page || 1;
        let limit = request.queryParams.limit;
        let collection = labels.all();

        // Handle filter param for server-side search (e.g. filter=name:~'term')
        const nameFilter = extractFilterParam('name', request.queryParams.filter);
        if (nameFilter) {
            const term = nameFilter.toLowerCase();
            collection.models = collection.models.filter(
                label => label.name.toLowerCase().includes(term)
            );
        }

        if (limit !== 'all') {
            limit = +limit || 15;
        }

        return paginateModelCollection('labels', collection, page, limit);
    });

    server.get('/labels/:id/', function ({labels}, {params}) {
        let {id} = params;
        let label = labels.find(id);

        return label || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Label not found.'
            }]
        });
    });

    server.put('/labels/:id/');

    server.del('/labels/:id/');
}
