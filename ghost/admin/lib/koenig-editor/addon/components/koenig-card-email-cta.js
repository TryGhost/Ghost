import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatTextReplacementHtml} from './koenig-text-replacement-html-input';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class KoenigCardEmailCtaComponent extends Component {
    @service config;
    @service membersUtils;
    @service ui;

    @tracked buttonFocused = false;
    @tracked contentFocused = false;

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
            name: `Link to ${this.config.get('blogTitle')}`,
            url: this.config.getSiteUrl('/')
        }, {
            name: 'Free email signup',
            url: this.config.getSiteUrl('/#/portal/signup/free')
        }]);

        if (this.membersUtils.isStripeEnabled) {
            urls.push(...[{
                name: 'Paid subscription',
                url: this.config.getSiteUrl('/#/portal/signup')
            }, {
                name: 'Upgrade or change plan',
                url: this.config.getSiteUrl('/#/portal/account/plans')
            }]);
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
        const {html, buttonText, buttonUrl} = this.args.payload;

        if (isBlank(html) && isBlank(buttonText) && isBlank(buttonUrl)) {
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

    _updatePayloadAttr(attr, value) {
        let payload = this.args.payload;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        this.args.saveCard?.(payload, false);
    }

    /* key commands ----------------------------------------------------------*/

    _enter(modifier) {
        if (this.isEditing && (modifier === 'meta' || (modifier === 'crtl' && Browser.isWin()))) {
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
