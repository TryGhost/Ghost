const TableImporter = require('./table-importer');

class ProductsBenefitsImporter extends TableImporter {
    static table = 'products_benefits';
    static dependencies = ['benefits', 'products'];

    constructor(knex, transaction) {
        super(ProductsBenefitsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const products = await this.transaction.select('id', 'name').from('products');
        this.benefits = await this.transaction.select('id').from('benefits');

        await this.importForEach(products, quantity ? quantity / products.length : 5);
    }

    setReferencedModel(model) {
        this.model = model;

        this.sortOrder = 0;
        switch (this.model.name) {
        case 'Bronze':
            this.benefitCount = 1;
            break;
        case 'Silver':
            this.benefitCount = 3;
            break;
        case 'Gold':
            this.benefitCount = 5;
            break;
        case 'Free Preview':
            this.benefitCount = 0;
            break;
        }
    }

    generate() {
        if (this.sortOrder >= this.benefitCount) {
            // No more benefits than benefitCount
            return null;
        }
        const sortOrder = this.sortOrder;
        this.sortOrder = this.sortOrder + 1;
        return {
            id: this.fastFakeObjectId(),
            product_id: this.model.id,
            benefit_id: this.benefits[sortOrder].id,
            sort_order: sortOrder
        };
    }
}

module.exports = ProductsBenefitsImporter;
