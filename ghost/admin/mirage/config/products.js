import {paginatedResponse} from '../utils';

export default function mockProducts(server) {
    server.post('/products/', function ({products}) {
        let attrs = this.normalizedRequestAttrs();

        return products.create(Object.assign({}, attrs, {id: 99}));
    });

    server.get('/products/', paginatedResponse('products'));

    server.get('/products/:id/', function ({products}, {params}) {
        let {id} = params;
        let product = products.find(id);

        return product || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Product not found.'
            }]
        });
    });

    server.put('/products/:id/');

    server.del('/products/:id/');
}
