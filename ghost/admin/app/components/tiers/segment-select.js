import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class TiersSegmentSelect extends Component {
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
        const tierList = (this.args.tiers || []).map((product) => {
            return this.products.find((p) => {
                return p.id === product.id || p.slug === product.slug;
            });
        }).filter(d => !!d);
        const tierIdList = tierList.map(d => d.id);
        return this.flatOptions.filter(option => tierIdList.includes(option.id));
    }

    @action
    setSegment(options) {
        let ids = options.mapBy('id').map((id) => {
            let product = this.products.find((p) => {
                return p.id === id;
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
                        id: product.id,
                        count: product.count?.members,
                        class: 'segment-product'
                    });
                });

                options.push(productsGroup);
                if (this.args.selectDefaultProduct && !this.args.tiers) {
                    this.setSegment([productsGroup.options[0]]);
                }
            }
        }

        this._options = options;
    }
}
