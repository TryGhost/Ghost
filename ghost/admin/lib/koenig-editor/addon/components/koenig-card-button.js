import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class KoenigCardButtonComponent extends Component {
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    @inject config;

    @tracked buttonFocused = false;
    @tracked contentFocused = false;
    @tracked offers = null;

    linkScrollerTimeout = null; // needs to be global so can be cleared when needed across functions

    get isEmpty() {
        const {buttonText, buttonUrl} = this.args.payload;

        return isBlank(buttonText) && isBlank(buttonUrl);
    }

    get isIncomplete() {
        const {buttonText, buttonUrl} = this.args.payload;

        return isBlank(buttonText) || isBlank(buttonUrl);
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

    get suggestedUrls() {
        const urls = [];

        urls.push(...[{
            name: `Homepage`,
            url: this.config.getSiteUrl('/')
        }, {
            name: 'Free signup',
            url: this.config.getSiteUrl('/#/portal/signup/free')
        }]);

        if (this.membersUtils.paidMembersEnabled) {
            urls.push(...[{
                name: 'Paid signup',
                url: this.config.getSiteUrl('/#/portal/signup')
            }, {
                name: 'Upgrade or change plan',
                url: this.config.getSiteUrl('/#/portal/account/plans')
            }]);
        }

        if (this.offers) {
            this.offers.forEach((offer) => {
                urls.push(...[{
                    name: `Offer - ${offer.name}`,
                    url: this.config.getSiteUrl(offer.code)
                }]);
            });
        }

        return urls;
    }

    constructor() {
        super(...arguments);
        this.args.registerComponent(this);

        const payloadDefaults = {
            alignment: 'center'
        };

        Object.entries(payloadDefaults).forEach(([key, value]) => {
            if (this.args.payload[key] === undefined) {
                this._updatePayloadAttr(key, value);
            }
        });

        this.fetchOffersTask.perform();
    }

    // required for snippet rects to be calculated - editor reaches in to component,
    // expecting a non-Glimmer component with a .element property
    @action
    registerElement(element) {
        this.element = element;
    }

    @action
    setButtonText(event) {
        this._updatePayloadAttr('buttonText', event.target.value);
    }

    @action
    setButtonUrl(url) {
        this._updatePayloadAttr('buttonUrl', url);
    }

    @action
    setAlignment(alignment, event) {
        event.preventDefault();
        this._updatePayloadAttr('alignment', alignment);
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

    @action
    enterLinkURL(event) {
        event.stopPropagation();
        const parent = event.target;
        const child = event.target.querySelector('span');

        clearTimeout(this.linkScrollerTimeout);
        if (child.offsetWidth > parent.offsetWidth) {
            this.linkScrollerTimeout = setTimeout(() => {
                parent.classList.add('scroller');
                child.style.transform = `translateX(-${(child.offsetWidth - parent.offsetWidth) + 8}px)`;
            }, 100);
        }
    }

    @action
    leaveLinkURL(event) {
        event.stopPropagation();
        clearTimeout(this.linkScrollerTimeout);
        const parent = event.target;
        const child = event.target.querySelector('span');

        child.style.transform = 'translateX(0)';
        parent.classList.remove('scroller');
    }

    @task({restartable: true})
    *fetchOffersTask() {
        this.offers = yield this.store.query('offer', {limit: 'all', filter: 'status:active'});
    }

    _updatePayloadAttr(attr, value) {
        let payload = this.args.payload;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        this.args.saveCard?.(payload, false);
    }
}
