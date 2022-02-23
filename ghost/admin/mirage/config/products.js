import {paginatedResponse} from '../utils';

export default function mockProducts(server) {
    server.post('/products/');

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

    server.put('/products/:id/', function ({products, productBenefits}, {params}) {
        const attrs = this.normalizedRequestAttrs();
        const product = products.find(params.id);

        const benefitAttrs = attrs.benefits;
        delete attrs.benefits;

        product.update(attrs);

        benefitAttrs.forEach((benefit) => {
            if (benefit.id) {
                const productBenefit = productBenefits.find(benefit.id);
                productBenefit.product = product;
                productBenefit.save();
            } else {
                product.createProductBenefit(benefit);
                product.save();
            }
        });

        return product.save();
    });

    server.del('/products/:id/');
}
