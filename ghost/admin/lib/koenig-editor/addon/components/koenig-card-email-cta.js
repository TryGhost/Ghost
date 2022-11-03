import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatTextReplacementHtml} from './koenig-text-replacement-html-input';
import {guidFor} from '@ember/object/internals';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {schedule} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class KoenigCardEmailCtaComponent extends Component {
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    @inject config;

    @tracked buttonFocused = false;
    @tracked contentFocused = false;
    @tracked offers = null;

    buttonTextInputId = 'button-text-input-' + guidFor(this);
    urlInputId = 'url-input-' + guidFor(this);
    linkScrollerTimeout = null; // needs to be global so can be cleared when needed across functions

    get isEmpty() {
        const {html, showButton, buttonText, buttonUrl} = this.args.payload;

        if (!showButton) {
            return isBlank(html);
        }

        return isBlank(html) && isBlank(buttonText) && isBlank(buttonUrl);
    }

    get formattedHtml() {
        return formatTextReplacementHtml(this.args.payload.html);
    }

    get segments() {
        return [{
            name: 'free members',
            filter: 'status:free'
        }, {
            name: 'paid members',
            filter: 'status:-free'
        }];
    }

    get selectedSegment() {
        return this.segments.find(segment => segment.filter === this.args.payload.segment);
    }

    get toolbar() {
        if (this.args.isEditing) {
            return false;
        }

        const items = [];

        items.push({
            buttonClass: 'fw4 flex items-center white',
            icon: 'koenig/kg-edit',
            iconClass: 'fill-white',
            title: 'Edit',
            text: '',
            action: run.bind(this, this.args.editCard)
        });

        return {items};
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
            showButton: false,
            showDividers: true,
            segment: 'status:free',
            alignment: 'left'
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
    updateHtml(html) {
        this._updatePayloadAttr('html', html);
    }

    @action
    setSegment(segment) {
        this._updatePayloadAttr('segment', segment.filter);
    }

    @action
    toggleButton() {
        this._updatePayloadAttr('showButton', !this.args.payload.showButton);

        if (this.args.payload.showButton) {
            schedule('afterRender', this, function () {
                document.getElementById(this.buttonTextInputId)?.focus();
            });
        }
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
    toggleDividers() {
        this._updatePayloadAttr('showDividers', !this.args.payload.showDividers);
    }

    @action
    registerEditor(textReplacementEditor) {
        let commands = {
            'META+ENTER': run.bind(this, this._enter, 'meta'),
            'CTRL+ENTER': run.bind(this, this._enter, 'ctrl')
        };

        Object.keys(commands).forEach((str) => {
            textReplacementEditor.registerKeyCommand({
                str,
                run() {
                    return commands[str](textReplacementEditor, str);
                }
            });
        });

        this._textReplacementEditor = textReplacementEditor;

        run.scheduleOnce('afterRender', this, this._placeCursorAtEnd);
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
    blurElement(event) {
        event.preventDefault();
        event.target.blur();
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

    /* key commands ----------------------------------------------------------*/

    _enter(modifier) {
        if (this.isEditing && (modifier === 'meta' || (modifier === 'ctrl' && Browser.isWin()))) {
            this.args.editCard?.();
        }
    }

    _placeCursorAtEnd() {
        if (!this._textReplacementEditor) {
            return;
        }

        let tailPosition = this._textReplacementEditor.post.tailPosition();
        let rangeToSelect = tailPosition.toRange();
        this._textReplacementEditor.selectRange(rangeToSelect);
    }
}
