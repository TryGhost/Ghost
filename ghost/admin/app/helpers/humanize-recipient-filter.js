import {capitalize} from '@ember/string';
import {helper} from '@ember/component/helper';
import {pluralize} from 'ember-inflector';

// NOTE: this only works for the limited set of filters that can be generated
// via the publishing UI. Falls back to outputting the raw filter
export default helper(function humanizeRecipientFilter([filter = '']/*, hash*/) {
    const parts = filter.split(',');

    if (parts.includes('status:free') && parts.includes('status:-free')) {
        return 'All subscribers';
    }

    let outputParts = [];

    if (parts.includes('status:free')) {
        outputParts.push('Free subscribers');
    } else if (parts.includes('status:-free')) {
        outputParts.push('Paid subscribers');
    }

    const labelsArrayRegex = /labels:\[(.*?)\]/;
    const labelRegex = /label:(.*?)(?:,|$)/g;

    if (labelsArrayRegex.test(filter)) {
        const [, labelsList] = filter.match(labelsArrayRegex);
        const labels = labelsList.split(',');
        outputParts.push(`${pluralize(labels.length, 'Label', {withoutCount: true})}: ${labels.map(capitalize).join(', ')}`);
    } else if (labelRegex.test(filter)) {
        filter.match(labelRegex); // weird JS thing, `matchAll` doesn't pick up all matches without this
        const labels = [...filter.matchAll(labelRegex)].map(([, label]) => label);
        outputParts.push(`${pluralize(labels.length, 'Label', {withoutCount: true})}: ${labels.map(capitalize).join(', ')}`);
    }

    const productsArrayRegex = /products:\[(.*?)\]/;
    const productRegex = /product:(.*?)(?:,|$)/g;

    if (productsArrayRegex.test(filter)) {
        const [, productsList] = filter.match(productsArrayRegex);
        const products = productsList.split(',');
        outputParts.push(`${pluralize(products.length, 'Product', {withoutCount: true})}: ${products.map(capitalize).join(', ')}`);
    } else if (productRegex.test(filter)) {
        filter.match(productRegex); // weird JS thing, `matchAll` doesn't pick up all matches without this
        const products = [...filter.matchAll(productRegex)].map(([, product]) => product);
        outputParts.push(`${pluralize(products.length, 'Product', {withoutCount: true})}: ${products.map(capitalize).join(', ')}`);
    }

    if (!outputParts.length) {
        return filter;
    }

    return outputParts.join(' & ');
});
