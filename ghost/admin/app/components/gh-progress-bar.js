import Component from '@ember/component';
import {htmlSafe} from '@ember/string';

export default Component.extend({
    tagName: '',

    // Public attributes
    percentage: 0,
    isError: false,

    // Internal attributes
    progressStyle: '',

    didReceiveAttrs() {
        this._super(...arguments);

        let percentage = this.get('percentage');
        let width = (percentage > 0) ? `${percentage}%` : '0';

        this.set('progressStyle', htmlSafe(`width: ${width}`));
    }

});
