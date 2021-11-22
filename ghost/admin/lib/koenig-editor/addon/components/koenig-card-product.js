import Component from '@glimmer/component';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';

export default class KoenigCardProductComponent extends Component {
    @service config;
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    get isEmpty() {
        const {productTitle, productDescription, productUrl} = this.args.payload;

        return isBlank(productTitle) && isBlank(productDescription) && isBlank(productUrl);
    }

    get isIncomplete() {
        const {productTitle, productDescription, productUrl} = this.args.payload;

        return isBlank(productTitle) || isBlank(productDescription) || isBlank(productUrl);
    }

    get toolbar() {
        if (this.args.isEditing) {
            return false;
        }

        return {
            items: [{
                buttonClass: 'fw4 flex items-center white',
                icon: 'koenig/kg-edit',
                iconClass: 'fill-white',
                title: 'Edit',
                text: '',
                action: run.bind(this, this.args.editCard)
            }]
        };
    }

    constructor() {
        super(...arguments);
        this.args.registerComponent(this);

        const payloadDefaults = {};

        Object.entries(payloadDefaults).forEach(([key, value]) => {
            if (this.args.payload[key] === undefined) {
                this._updatePayloadAttr(key, value);
            }
        });
    }

    // required for snippet rects to be calculated - editor reaches in to component,
    // expecting a non-Glimmer component with a .element property
    @action
    registerElement(element) {
        this.element = element;
    }

    @action
    setProductTitle(event) {
        this._updatePayloadAttr('productTitle', event.target.value);
    }

    @action
    setProductDescription(event) {
        this._updatePayloadAttr('productDescription', event.target.value);
    }

    @action
    setProductUrl(event) {
        this._updatePayloadAttr('productUrl', event.target.value);
    }

    @action
    leaveEditMode() {
        if (this.isEmpty) {
            // afterRender is required to avoid double modification of `isSelected`
            // TODO: see if there's a way to avoid afterRender
            run.scheduleOnce('afterRender', this, this.args.deleteCard);
        }
    }

    @action
    focusElement(selector, event) {
        event.preventDefault();
        document.querySelector(selector)?.focus();
    }

    _updatePayloadAttr(attr, value) {
        let payload = this.args.payload;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        this.args.saveCard?.(payload, false);
    }
}
