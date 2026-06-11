import ActionButton from './common/action-button';
import AppContext from '../app-context';
import CloseIcon from '../images/icons/close.svg?react';
import CustomFieldInput from './common/custom-field-input';
import Frame from './frame';
import LandingCardStyles from './landing-card.styles';
import React from 'react';
import * as customFields from '../../../../poc/custom-fields/repo';
import {clearURLParams} from '../utils/notifications';
import {getFrameStyles} from './frame.styles';
import {t} from '../utils/i18n';

// POC Story 5.5: the member-facing Landing card. A soft, dismissible prompt shown
// over whatever page a logged-in member lands on, asking for the custom fields of
// the landing form that targets them.
//
// A member is assigned the FIRST enabled form whose audience matches them (order
// = priority; one form per member). The card shows when: that form has a field
// they haven't answered AND they haven't dismissed it. `?cf_landing` force-opens
// the matched form (the email "complete your profile" route). Save persists
// values; Not now / close dismisses (per form). Audience matching here is a
// client-side NQL subset (status/paid/tier); labels resolve server-side in a
// real build.
const FORCE_PARAM = 'cf_landing';

const isEmpty = value => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

export default class LandingCard extends React.Component {
    static contextType = AppContext;

    constructor() {
        super();
        this.state = {
            active: false,
            forced: false,
            formId: null,
            fields: [],
            values: {},
            errors: {},
            frameHeight: 0,
            maxHeight: this.viewportCap()
        };
    }

    componentDidMount() {
        this.load();
        // The repo bridges admin edits across bundles; keep the card in sync while open.
        this.cfUnsubscribe = customFields.subscribe(() => this.load());
        window.addEventListener('resize', this.onResize);
    }

    componentWillUnmount() {
        this.cfUnsubscribe?.();
        this.teardownMeasure();
        window.removeEventListener('resize', this.onResize);
    }

    // Cap the card to the parent viewport so long forms scroll internally instead
    // of pushing the buttons off-screen. Leaves a small margin top and bottom.
    viewportCap() {
        return (typeof window !== 'undefined' ? window.innerHeight : 800) - 48;
    }

    onResize = () => {
        this.setState({maxHeight: this.viewportCap()}, this.measure);
    };

    get memberId() {
        // The Portal member object exposes `uuid` (not `id`); that's the per-member
        // key shared with the account page. See poc CHALLENGES (cross-surface key).
        return this.context.member?.uuid;
    }

    async load() {
        const {memberId} = this;
        // Once closed this session (saved/dismissed), stay closed until the next
        // page load, even if a repo change notification re-runs load().
        if (!memberId || this.closed) {
            this.setState({active: false});
            return;
        }

        const forced = new URLSearchParams(window.location.search).get(FORCE_PARAM) !== null;

        const [forms, defs, values] = await Promise.all([
            customFields.listLandingForms(),
            customFields.listFields(),
            customFields.getValues(memberId)
        ]);

        // Assign the member to the first enabled form whose audience matches them.
        const member = this.context.member || {};
        const matchMember = {
            paid: member.paid,
            status: member.status,
            tiers: (member.subscriptions || []).map(sub => sub.tier || (sub.price && sub.price.tier)).filter(Boolean)
        };
        const matched = forms.find(form => form.enabled && customFields.matchAudience(form.audience, matchMember));

        if (!matched) {
            this.setState({active: false});
            return;
        }

        const dismissed = await customFields.isDismissed(memberId, matched.id);

        // Resolve the form's placements to live (non-archived) definitions, ordered.
        const placed = (matched.fields || [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(placement => defs.find(def => def.id === placement.fieldId && !def.archived))
            .filter(Boolean);

        // Forced (email link) shows every field; otherwise only the unanswered ones.
        const fields = forced ? placed : placed.filter(def => isEmpty(values[def.id]));

        const active = fields.length > 0 && (forced || !dismissed);

        this.setState(state => ({
            active,
            forced,
            formId: matched.id,
            fields,
            // Keep any edits the member already typed; seed the rest from stored values.
            values: {...values, ...state.values},
            errors: active ? state.errors : {}
        }), this.setupMeasure);
    }

    // The card lives in an iframe; size the frame to its content so it doesn't
    // swallow clicks over empty space. A ResizeObserver on the card body updates
    // the height only when content actually changes (e.g. an error row appears),
    // so there's no periodic reflow to fight the slide-up animation.
    setupMeasure = () => {
        if (!this.state.active) {
            return;
        }
        const card = this.frame?.node?.contentDocument?.querySelector('.gh-portal-landingcard');
        if (!card) {
            // The Frame portals content in after its iframe loads; retry next frame.
            this.rafId = requestAnimationFrame(this.setupMeasure);
            return;
        }
        if (!this.resizeObserver) {
            // Observe the card (not the body): its height changes only when content
            // does, not when we resize the iframe — so no measure/resize feedback loop.
            this.resizeObserver = new ResizeObserver(this.measure);
            this.resizeObserver.observe(card);
        }
        this.measure();
    };

    teardownMeasure() {
        cancelAnimationFrame(this.rafId);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
    }

    measure = () => {
        const card = this.frame?.node?.contentDocument?.querySelector('.gh-portal-landingcard');
        if (!card || !card.offsetHeight) {
            return;
        }
        // Frame height = card height + the wrapper's 16px padding top and bottom.
        // The card's own max-height already caps it to the viewport.
        const height = card.offsetHeight + 32;
        if (height !== this.state.frameHeight) {
            this.setState({frameHeight: height});
        }
    };

    handleChange(fieldId, value) {
        this.setState(state => ({
            values: {...state.values, [fieldId]: value},
            errors: {...state.errors, [fieldId]: undefined}
        }));
    }

    handleSave = () => {
        const errors = {};
        // POC: a field placed on the landing form is required at collection.
        this.state.fields.forEach((def) => {
            if (isEmpty(this.state.values[def.id])) {
                errors[def.id] = t('Please enter {fieldName}', {fieldName: def.label.toLowerCase()});
            }
        });

        if (Object.values(errors).some(Boolean)) {
            this.setState({errors}, this.measure);
            return;
        }

        const {memberId} = this;
        this.state.fields.forEach((def) => {
            customFields.setValue(memberId, def.id, this.state.values[def.id]);
        });

        this.close();
    };

    handleDismiss = () => {
        if (this.memberId && this.state.formId) {
            customFields.setDismissed(this.memberId, this.state.formId, true);
        }
        this.close();
    };

    close() {
        this.closed = true;
        this.teardownMeasure();
        if (this.state.forced) {
            clearURLParams([FORCE_PARAM]);
        }
        this.setState({active: false, errors: {}});
    }

    renderFrameStyles() {
        const {site, brandColor} = this.context;
        const styles = (brandColor ? `:root { --brandcolor: ${brandColor} }` : '') + getFrameStyles({site}) + LandingCardStyles;
        return (
            <>
                <style dangerouslySetInnerHTML={{__html: styles}} />
                <meta content="width=device-width, initial-scale=1, maximum-scale=1" name="viewport" />
            </>
        );
    }

    render() {
        if (!this.state.active) {
            return null;
        }

        const frameStyle = {
            zIndex: '4000000',
            position: 'fixed',
            bottom: '0',
            right: '0',
            maxWidth: '420px',
            width: '100%',
            height: `${this.state.frameHeight || 480}px`,
            transition: 'opacity 0.3s ease',
            overflow: 'hidden'
        };

        return (
            <Frame
                ref={node => (this.frame = node)}
                dataDir={this.context.dir}
                dataTestId="portal-landing-frame"
                head={this.renderFrameStyles()}
                style={frameStyle}
                title="portal-landing-card"
            >
                <div className="gh-portal-landingcard-wrapper">
                    <div className="gh-portal-landingcard" style={{maxHeight: `${this.state.maxHeight}px`}}>
                        <button aria-label={t('Close')} className="gh-portal-landingcard-close" type="button" onClick={this.handleDismiss}>
                            <CloseIcon />
                        </button>
                        <div className="gh-portal-landingcard-header">
                            {this.context.site?.icon && <img alt={this.context.site.title} className="gh-portal-landingcard-logo" src={this.context.site.icon} />}
                            <h2 className="gh-portal-landingcard-title">{t('Tell us a bit more about you')}</h2>
                        </div>
                        <div className="gh-portal-landingcard-fields">
                            {this.state.fields.map(field => (
                                <CustomFieldInput
                                    key={field.id}
                                    errorMessage={this.state.errors[field.id]}
                                    field={field}
                                    value={this.state.values[field.id]}
                                    onChange={value => this.handleChange(field.id, value)}
                                />
                            ))}
                        </div>
                        <div className="gh-portal-landingcard-actions">
                            <ActionButton brandColor={this.context.brandColor} label={t('Save')} style={{width: '100%'}} onClick={this.handleSave} />
                            <button className="gh-portal-landingcard-dismiss" type="button" onClick={this.handleDismiss}>{t('Not now')}</button>
                        </div>
                    </div>
                </div>
            </Frame>
        );
    }
}
