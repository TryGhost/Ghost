import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class VisibilitySegmentSelect extends Component {
    @service store;
    @service feature;

    @tracked _options = [];
    @tracked products = [];

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    constructor() {
        super(...arguments);
        this.fetchOptionsTask.perform();
    }

    get options() {
        if (this.args.hideOptionsWhenAllSelected) {
            const selectedSegments = this.selectedOptions.mapBy('segment');
            if (selectedSegments.includes('status:free') && selectedSegments.includes('status:-free')) {
                return this._options.filter(option => !option.groupName);
            }
        }

        return this._options;
    }

    get flatOptions() {
        const options = [];

        function getOptions(option) {
            if (option.options) {
                return option.options.forEach(getOptions);
            }

            options.push(option);
        }

        this._options.forEach(getOptions);

        return options;
    }

    get selectedOptions() {
        const segments = (this.args.segment || '').split(',');
        return this.flatOptions.filter(option => segments.includes(option.segment));
    }

    @action
    setSegment(options) {
        const segment = options.mapBy('segment').join(',') || null;
        let ids = segment?.split(',').map((d) => {
            let slug = d.replace('product:', '');
            let product = this.products.find((p) => {
                return p.slug === slug;
            });
            return {
                id: product.id,
                slug: product.slug,
                name: product.name
            };
        }) || [];
        this.args.onChange?.(ids);
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];

        if (this.feature.get('multipleProducts')) {
            // fetch all products with count
            // TODO: add `include: 'count.members` to query once API supports
            const products = yield this.store.query('product', {filter: 'type:paid', limit: 'all', include: 'monthly_price,yearly_price,benefits'});
            this.products = products;

            if (products.length > 0) {
                const productsGroup = {
                    groupName: 'Tiers',
                    options: []
                };

                products.forEach((product) => {
                    productsGroup.options.push({
                        name: product.name,
                        segment: `product:${product.slug}`,
                        count: product.count?.members,
                        class: 'segment-product'
                    });
                });

                options.push(productsGroup);
                if (this.args.selectDefaultProduct && !this.args.segment) {
                    this.args.onChange?.(productsGroup.options[0].segment);
                }
            }
        }

        this._options = options;
    }
}
