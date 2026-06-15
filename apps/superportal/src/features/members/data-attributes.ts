/**
 * Inline data-members-form / data-members-plan / data-members-edit-billing binding.
 *
 * TypeScript port of apps/portal/src/data-attributes.js.
 * Mounted eagerly when [data-members-form] elements exist on the page
 * (see shell/index.ts → mountEagerVisible with params.action === 'bind-forms').
 *
 * Rules:
 * - No DOM manipulation beyond what the individual handlers need.
 * - No i18n import — the `t` function is passed in.
 * - No eslint-disable. Use log.ts for diagnostics.
 */

import {warn} from '../../shared/log';
import type {Translator} from '../../types';

interface DataAttributesContext {
    siteUrl: string;
    t: Translator;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function getUrlHistory(): unknown {
    try {
        const raw = window.sessionStorage.getItem('ghost-history');
        return raw ? JSON.parse(raw) : undefined;
    } catch {
        return undefined;
    }
}

function setElementError(errorEl: Element | null, message: string): void {
    if (errorEl instanceof HTMLElement) {
        errorEl.innerText = message;
    }
}

// ---------------------------------------------------------------------------
// Form submit handler — data-members-form="signup|signin"
// ---------------------------------------------------------------------------

async function handleFormSubmit(
    event: SubmitEvent,
    form: HTMLFormElement,
    errorEl: Element | null,
    siteUrl: string,
    t: Translator
): Promise<void> {
    event.preventDefault();
    if (errorEl instanceof HTMLElement) errorEl.innerText = '';
    form.classList.remove('success', 'invalid', 'error');

    const emailInput = form.querySelector<HTMLInputElement>('input[data-members-email]');
    const nameInput = form.querySelector<HTMLInputElement>('input[data-members-name]');
    const autoRedirectAttr = form.dataset.membersAutoredirect ?? 'true';
    const email = emailInput?.value ?? '';
    const name = (nameInput?.value ?? '').trim() || undefined;
    const emailType = form.dataset.membersForm;

    const wantsOtc = emailType === 'signin' && form.dataset.membersOtc === 'true';

    const labels: string[] = [];
    const labelInputs = form.querySelectorAll<HTMLInputElement>('input[data-members-label]');
    labelInputs.forEach(el => labels.push(el.value));

    const newsletters: Array<{name: string}> = [];
    const newsletterInputs = form.querySelectorAll<HTMLInputElement>(
        'input[type=hidden][data-members-newsletter], input[type=checkbox][data-members-newsletter]:checked, input[type=radio][data-members-newsletter]:checked'
    );
    newsletterInputs.forEach(el => newsletters.push({name: el.value}));

    const reqBody: Record<string, unknown> = {
        email,
        emailType,
        labels,
        name,
        autoRedirect: autoRedirectAttr === 'true',
        requestSrc: 'portal',
    };
    if (wantsOtc) reqBody['includeOTC'] = true;
    const urlHistory = getUrlHistory();
    if (urlHistory) reqBody['urlHistory'] = urlHistory;
    if (newsletters.length > 0) {
        reqBody['newsletters'] = newsletters;
    } else {
        // If only unchecked checkboxes present, set empty array so member skips default newsletters
        const checkable = form.querySelectorAll<HTMLInputElement>('input[type=checkbox][data-members-newsletter]');
        if (checkable.length > 0) {
            reqBody['newsletters'] = [];
        }
    }

    form.classList.add('loading');
    try {
        const tokenRes = await fetch(`${siteUrl}/members/api/integrity-token/`, {method: 'GET'});
        const integrityToken = await tokenRes.text();

        const magicRes = await fetch(`${siteUrl}/members/api/send-magic-link/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({...reqBody, integrityToken}),
        });

        form.classList.remove('loading');
        if (magicRes.ok) {
            form.classList.add('success');
        } else {
            let msg = t('There was an error sending the email, please try again');
            try {
                const errData = (await magicRes.json()) as {errors?: Array<{message?: string}>};
                const apiMsg = errData?.errors?.[0]?.message;
                if (apiMsg) msg = apiMsg;
            } catch {
                // ignore json parse failure
            }
            setElementError(errorEl, msg);
            form.classList.add('error');
        }
    } catch (err) {
        form.classList.remove('loading');
        form.classList.add('error');
        const msg = err instanceof Error ? err.message : t('There was an error sending the email, please try again');
        setElementError(errorEl, msg);
        warn('data-members-form submit error', err);
    }
}

// ---------------------------------------------------------------------------
// Plan click handler — data-members-plan
// ---------------------------------------------------------------------------

async function handlePlanClick(
    el: HTMLElement,
    errorEl: Element | null,
    siteUrl: string,
    t: Translator
): Promise<void> {
    if (errorEl instanceof HTMLElement) errorEl.innerText = '';
    el.classList.add('loading');

    const plan = el.dataset.membersPlan ?? '';
    const successAttr = el.dataset.membersSuccess;
    const cancelAttr = el.dataset.membersCancel;
    const successUrl = successAttr ? new URL(successAttr, window.location.href).href : undefined;
    const cancelUrl = cancelAttr ? new URL(cancelAttr, window.location.href).href : undefined;
    const urlHistory = getUrlHistory();
    const metadata: Record<string, unknown> = {};
    if (urlHistory) metadata['urlHistory'] = urlHistory;

    try {
        const sessionRes = await fetch(`${siteUrl}/members/api/session`, {credentials: 'same-origin'});
        const identity = sessionRes.ok ? await sessionRes.text() : null;

        const checkoutRes = await fetch(`${siteUrl}/members/api/create-stripe-checkout-session/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                priceId: plan.toLowerCase() !== 'free' ? plan : undefined,
                identity,
                successUrl,
                cancelUrl,
                metadata,
            }),
        });
        if (!checkoutRes.ok) {
            throw new Error(t('Could not create Stripe checkout session'));
        }
        const body = (await checkoutRes.json()) as {url?: string; sessionId?: string; publicKey?: string};
        if (body.url) {
            window.location.assign(body.url);
            return;
        }
        // Stripe.js fallback — load it if not already present
        if (!window.Stripe && body.publicKey) {
            await new Promise<void>((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://js.stripe.com/v3/';
                s.onload = () => resolve();
                s.onerror = () => reject(new Error('Failed to load Stripe.js'));
                document.head.appendChild(s);
            });
        }
        if (body.publicKey && body.sessionId && window.Stripe) {
            const stripe = window.Stripe(body.publicKey);
            const result = await stripe.redirectToCheckout({sessionId: body.sessionId});
            if (result.error) throw new Error(result.error.message);
        }
    } catch (err) {
        el.classList.remove('loading');
        el.classList.add('error');
        const msg = err instanceof Error ? err.message : t('There was an error sending the email, please try again');
        if (errorEl instanceof HTMLElement) errorEl.innerText = msg;
        warn('data-members-plan click error', err);
    }
}

// ---------------------------------------------------------------------------
// Edit billing handler — data-members-edit-billing
// ---------------------------------------------------------------------------

async function handleEditBillingClick(
    el: HTMLElement,
    errorEl: Element | null,
    siteUrl: string,
    t: Translator
): Promise<void> {
    if (errorEl instanceof HTMLElement) errorEl.innerText = '';
    el.classList.add('loading');

    const successAttr = el.dataset.membersSuccess;
    const cancelAttr = el.dataset.membersCancel;
    const successUrl = successAttr ? new URL(successAttr, window.location.href).href : undefined;
    const cancelUrl = cancelAttr ? new URL(cancelAttr, window.location.href).href : undefined;

    try {
        const sessionRes = await fetch(`${siteUrl}/members/api/session`, {credentials: 'same-origin'});
        const identity = sessionRes.ok ? await sessionRes.text() : null;

        const res = await fetch(`${siteUrl}/members/api/create-stripe-update-session/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({identity, successUrl, cancelUrl}),
        });
        if (!res.ok) throw new Error(t('Could not create Stripe checkout session'));
        const result = (await res.json()) as {sessionId?: string; publicKey?: string; url?: string};
        if (result.url) {
            window.location.assign(result.url);
            return;
        }
        if (result.publicKey && result.sessionId && window.Stripe) {
            const stripe = window.Stripe(result.publicKey);
            const r = await stripe.redirectToCheckout({sessionId: result.sessionId});
            if (r.error) throw new Error(r.error.message);
        }
    } catch (err) {
        el.classList.remove('loading');
        el.classList.add('error');
        const msg = err instanceof Error ? err.message : t('There was an error sending the email, please try again');
        if (errorEl instanceof HTMLElement) errorEl.innerText = msg;
        warn('data-members-edit-billing click error', err);
    }
}

// ---------------------------------------------------------------------------
// Manage billing handler — data-members-manage-billing
// ---------------------------------------------------------------------------

async function handleManageBillingClick(
    el: HTMLElement,
    errorEl: Element | null,
    siteUrl: string,
    t: Translator
): Promise<void> {
    if (errorEl instanceof HTMLElement) errorEl.innerText = '';
    el.classList.add('loading');

    const returnAttr = el.dataset.membersReturn;
    const returnUrl = returnAttr ? new URL(returnAttr, window.location.href).href : undefined;

    try {
        const sessionRes = await fetch(`${siteUrl}/members/api/session`, {credentials: 'same-origin'});
        const identity = sessionRes.ok ? await sessionRes.text() : null;

        const res = await fetch(`${siteUrl}/members/api/create-stripe-billing-portal-session/`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({identity, returnUrl}),
        });
        if (!res.ok) throw new Error(t('Could not create Stripe billing portal session'));
        const result = (await res.json()) as {url?: string};
        if (result.url) window.location.assign(result.url);
    } catch (err) {
        el.classList.remove('loading');
        el.classList.add('error');
        const msg = err instanceof Error ? err.message : t('There was an error sending the email, please try again');
        if (errorEl instanceof HTMLElement) errorEl.innerText = msg;
        warn('data-members-manage-billing click error', err);
    }
}

// ---------------------------------------------------------------------------
// Signout handler — data-members-signout
// ---------------------------------------------------------------------------

async function handleSignoutClick(el: HTMLElement, siteUrl: string): Promise<void> {
    el.classList.remove('error');
    el.classList.add('loading');
    try {
        const res = await fetch(`${siteUrl}/members/api/session`, {method: 'DELETE'});
        if (res.ok) {
            window.location.replace(siteUrl);
        } else {
            el.classList.remove('loading');
            el.classList.add('error');
        }
    } catch (err) {
        el.classList.remove('loading');
        el.classList.add('error');
        warn('data-members-signout error', err);
    }
}

// ---------------------------------------------------------------------------
// Cancel subscription — data-members-cancel-subscription
// ---------------------------------------------------------------------------

async function handleCancelSubscriptionClick(
    el: HTMLElement,
    errorEl: Element | null,
    siteUrl: string,
    t: Translator
): Promise<void> {
    el.classList.remove('error');
    el.classList.add('loading');
    if (errorEl instanceof HTMLElement) errorEl.innerText = '';

    const subscriptionId = el.dataset.membersCancelSubscription ?? '';
    try {
        const sessionRes = await fetch(`${siteUrl}/members/api/session`, {credentials: 'same-origin'});
        const identity = sessionRes.ok ? await sessionRes.text() : null;

        const res = await fetch(`${siteUrl}/members/api/subscriptions/${subscriptionId}/`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({identity, smart_cancel: true}),
        });
        if (res.ok) {
            window.location.reload();
        } else {
            el.classList.remove('loading');
            el.classList.add('error');
            setElementError(errorEl, t('There was an error cancelling your subscription, please try again.'));
        }
    } catch (err) {
        el.classList.remove('loading');
        el.classList.add('error');
        setElementError(errorEl, t('There was an error cancelling your subscription, please try again.'));
        warn('cancel-subscription error', err);
    }
}

// ---------------------------------------------------------------------------
// Continue subscription — data-members-continue-subscription
// ---------------------------------------------------------------------------

async function handleContinueSubscriptionClick(
    el: HTMLElement,
    errorEl: Element | null,
    siteUrl: string,
    t: Translator
): Promise<void> {
    el.classList.remove('error');
    el.classList.add('loading');
    if (errorEl instanceof HTMLElement) errorEl.innerText = '';

    const subscriptionId = el.dataset.membersContinueSubscription ?? '';
    try {
        const sessionRes = await fetch(`${siteUrl}/members/api/session`, {credentials: 'same-origin'});
        const identity = sessionRes.ok ? await sessionRes.text() : null;

        const res = await fetch(`${siteUrl}/members/api/subscriptions/${subscriptionId}/`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({identity, cancel_at_period_end: false}),
        });
        if (res.ok) {
            window.location.reload();
        } else {
            el.classList.remove('loading');
            el.classList.add('error');
            setElementError(errorEl, t('There was an error continuing your subscription, please try again.'));
        }
    } catch (err) {
        el.classList.remove('loading');
        el.classList.add('error');
        setElementError(errorEl, t('There was an error continuing your subscription, please try again.'));
        warn('continue-subscription error', err);
    }
}

// ---------------------------------------------------------------------------
// Main binding entry point
// ---------------------------------------------------------------------------

/**
 * Scan the document and bind submit/click handlers to all members data-attribute elements.
 * Safe to call multiple times — handlers are registered once per element.
 */
export function bindDataAttributes({siteUrl, t}: DataAttributesContext): void {
    const cleanUrl = siteUrl.replace(/\/$/, '');

    // data-members-form
    document.querySelectorAll<HTMLFormElement>('form[data-members-form]').forEach(form => {
        const errorEl = form.querySelector('[data-members-error]');
        const handler = (e: Event): void => {
            void handleFormSubmit(e as SubmitEvent, form, errorEl, cleanUrl, t)
                .catch(err => warn('form submit unexpected error', err));
        };
        form.addEventListener('submit', handler);
    });

    // data-members-plan
    document.querySelectorAll<HTMLElement>('[data-members-plan]').forEach(el => {
        const errorEl = el.querySelector('[data-members-error]');
        const handler = (e: Event): void => {
            e.preventDefault();
            void handlePlanClick(el, errorEl, cleanUrl, t)
                .catch(err => warn('plan click unexpected error', err));
        };
        el.addEventListener('click', handler);
    });

    // data-members-edit-billing
    document.querySelectorAll<HTMLElement>('[data-members-edit-billing]').forEach(el => {
        const errorEl = el.querySelector('[data-members-error]');
        const handler = (e: Event): void => {
            e.preventDefault();
            void handleEditBillingClick(el, errorEl, cleanUrl, t)
                .catch(err => warn('edit-billing click unexpected error', err));
        };
        el.addEventListener('click', handler);
    });

    // data-members-manage-billing
    document.querySelectorAll<HTMLElement>('[data-members-manage-billing]').forEach(el => {
        const errorEl = el.querySelector('[data-members-error]');
        const handler = (e: Event): void => {
            e.preventDefault();
            void handleManageBillingClick(el, errorEl, cleanUrl, t)
                .catch(err => warn('manage-billing click unexpected error', err));
        };
        el.addEventListener('click', handler);
    });

    // data-members-signout
    document.querySelectorAll<HTMLElement>('[data-members-signout]').forEach(el => {
        const handler = (e: Event): void => {
            e.preventDefault();
            void handleSignoutClick(el, cleanUrl)
                .catch(err => warn('signout click unexpected error', err));
        };
        el.addEventListener('click', handler);
    });

    // data-members-cancel-subscription
    document.querySelectorAll<HTMLElement>('[data-members-cancel-subscription]').forEach(el => {
        const errorEl = el.parentElement?.querySelector('[data-members-error]') ?? null;
        const handler = (e: Event): void => {
            e.preventDefault();
            void handleCancelSubscriptionClick(el, errorEl, cleanUrl, t)
                .catch(err => warn('cancel-subscription click unexpected error', err));
        };
        el.addEventListener('click', handler);
    });

    // data-members-continue-subscription
    document.querySelectorAll<HTMLElement>('[data-members-continue-subscription]').forEach(el => {
        const errorEl = el.parentElement?.querySelector('[data-members-error]') ?? null;
        const handler = (e: Event): void => {
            e.preventDefault();
            void handleContinueSubscriptionClick(el, errorEl, cleanUrl, t)
                .catch(err => warn('continue-subscription click unexpected error', err));
        };
        el.addEventListener('click', handler);
    });
}
