/* eslint-env browser */
/* eslint-disable no-console */
(function () {
    const configElement = document.querySelector('#gh-private-config');

    if (!configElement) {
        return;
    }

    let config = {};

    try {
        config = JSON.parse(configElement.textContent || '{}');
    } catch (error) {
        console.error('[Private page] Failed to parse config:', error);
        return;
    }

    const dialog = document.querySelector(config.accessDialogSelector || '#access');
    const trigger = document.querySelector('[data-ghost-private-trigger]');
    const closeButton = document.querySelector('[data-ghost-private-close]');
    const footerLinks = document.querySelector(config.footerLinksSelector || '.gh-private-trigger-wrap');
    const accessInput = dialog && dialog.querySelector('.gh-input');
    const subscribeForm = document.querySelector('[data-ghost-private-subscribe-form]');
    const subscribeFeedback = subscribeForm && subscribeForm.querySelector('[data-ghost-private-subscribe-feedback]');
    const subscribeInput = subscribeForm && subscribeForm.querySelector('input[data-members-email]');
    const subscribeButton = subscribeForm && subscribeForm.querySelector('.gh-private-signup-btn');

    let subscribeSuccessTimeout;

    const messages = {
        invalidEmail: config.invalidEmailMessage || 'Please enter a valid email address',
        genericError: config.genericErrorMessage || 'Something went wrong, please try again.',
        confirmEmail: config.confirmEmailMessage || 'Thanks! Now check your email to confirm.',
        subscriptionConfirmed: config.subscriptionConfirmedMessage || 'Subscription confirmed!',
        restrictedDomain: config.restrictedDomainMessage || 'Signups from this email domain are currently restricted.',
        tooManyAttempts: config.tooManyAttemptsMessage || 'Too many sign-up attempts, try again later'
    };
    const successResetDelay = Number.isFinite(config.successResetDelay) ? config.successResetDelay : 1000;

    const getUrlHistory = function () {
        const storageKey = 'ghost-history';

        try {
            const historyString = sessionStorage.getItem(storageKey);

            if (historyString) {
                const parsed = JSON.parse(historyString);

                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn('[Private signup] Failed to load member URL history:', error);
        }
    };

    const clearSubscribeSuccessTimeout = function () {
        if (subscribeSuccessTimeout) {
            window.clearTimeout(subscribeSuccessTimeout);
            subscribeSuccessTimeout = null;
        }
    };

    const setSubscribeFormState = function (state) {
        if (!subscribeForm) {
            return;
        }

        subscribeForm.dataset.state = state;

        const isBusy = state === 'loading' || state === 'success';

        if (subscribeInput) {
            subscribeInput.disabled = isBusy;
        }

        if (subscribeButton) {
            subscribeButton.disabled = isBusy;
        }
    };

    const setSubscribeFeedbackState = function (state) {
        if (!subscribeFeedback) {
            return;
        }

        subscribeFeedback.dataset.state = state;
    };

    const setSubscribeFeedback = function (message, state) {
        if (!subscribeFeedback) {
            return;
        }

        subscribeFeedback.textContent = message || '';
        setSubscribeFeedbackState(state || 'idle');
    };

    const clearNotificationParams = function (paramsToClear) {
        const searchParams = new URLSearchParams(window.location.search);

        paramsToClear.forEach(function (param) {
            searchParams.delete(param);
        });

        const queryString = searchParams.toString();
        const nextUrl = window.location.pathname + (queryString ? `?${queryString}` : '') + window.location.hash;
        window.history.replaceState({}, '', nextUrl);
    };

    const normalizeSubscribeErrorMessage = function (error) {
        if (!error || !error.message) {
            return messages.genericError;
        }

        var message = error.message;
        var type = error.type || '';

        if (/email is not valid/i.test(message) || /valid email address/i.test(message)) {
            return messages.invalidEmail;
        }

        if (type === 'TooManyRequestsError') {
            return messages.tooManyAttempts;
        }

        if (/restricted/i.test(message)) {
            return messages.restrictedDomain;
        }

        return messages.genericError;
    };

    const applySubscribeNotificationState = function () {
        if (!subscribeForm) {
            return;
        }

        const queryParams = new URLSearchParams(window.location.search);

        if (queryParams.get('action') !== 'signup') {
            return;
        }

        clearNotificationParams(['action', 'success']);

        if (queryParams.get('success') === 'true') {
            clearSubscribeSuccessTimeout();
            setSubscribeFeedback(messages.subscriptionConfirmed, 'success');
            setSubscribeFormState('success');
            subscribeSuccessTimeout = window.setTimeout(function () {
                setSubscribeFormState('idle');
            }, successResetDelay);
        }
    };

    const openDialog = function () {
        if (!dialog) {
            return;
        }

        if (!dialog.open) {
            dialog.showModal();
        }

        if (accessInput) {
            accessInput.focus();
        }
    };

    const closeDialog = function () {
        if (dialog && dialog.open) {
            dialog.close();
        }
    };

    if (dialog && trigger && closeButton) {
        if (typeof dialog.showModal !== 'function') {
            dialog.classList.add('gh-private-dialog-fallback');
            dialog.setAttribute('open', '');

            if (footerLinks) {
                footerLinks.hidden = true;
            }
        } else {
            trigger.addEventListener('click', function (event) {
                event.preventDefault();
                openDialog();
            });

            closeButton.addEventListener('click', function () {
                closeDialog();
            });

            dialog.addEventListener('click', function (event) {
                if (event.target === dialog) {
                    closeDialog();
                }
            });

            if (dialog.dataset.autoOpen === 'true') {
                openDialog();
            }
        }
    }

    applySubscribeNotificationState();

    if (!subscribeForm || !subscribeInput) {
        return;
    }

    subscribeForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearSubscribeSuccessTimeout();

        subscribeInput.value = subscribeInput.value.trim();

        if (!subscribeInput.checkValidity()) {
            setSubscribeFormState('idle');
            setSubscribeFeedback(messages.invalidEmail, 'error');
            subscribeInput.focus();
            return;
        }

        setSubscribeFormState('loading');
        setSubscribeFeedback('', 'idle');

        try {
            const siteUrl = (subscribeForm.dataset.siteUrl || window.location.origin).replace(/\/$/, '');
            const autoRedirect = subscribeForm.dataset.membersAutoredirect || 'true';
            const nameInput = subscribeForm.querySelector('input[data-members-name]');
            const labelInputs = subscribeForm.querySelectorAll('input[data-members-label]');
            const newsletterInputs = subscribeForm.querySelectorAll('input[type=hidden][data-members-newsletter], input[type=checkbox][data-members-newsletter]:checked, input[type=radio][data-members-newsletter]:checked');
            const checkableNewsletterInputs = subscribeForm.querySelectorAll('input[type=checkbox][data-members-newsletter]');
            const urlHistory = getUrlHistory();
            const labels = Array.from(labelInputs).map(inputEl => inputEl.value);
            const newsletters = Array.from(newsletterInputs).map(inputEl => ({name: inputEl.value}));
            const reqBody = {
                email: subscribeInput.value.trim(),
                emailType: subscribeForm.dataset.membersForm,
                labels,
                name: (nameInput?.value || '').trim() || undefined,
                autoRedirect: autoRedirect === 'true'
            };

            if (urlHistory) {
                reqBody.urlHistory = urlHistory;
            }

            if (newsletterInputs.length > 0) {
                reqBody.newsletters = newsletters;
            } else if (checkableNewsletterInputs.length > 0) {
                reqBody.newsletters = [];
            }

            const integrityTokenRes = await fetch(siteUrl + '/members/api/integrity-token/', {method: 'GET'});

            if (!integrityTokenRes.ok) {
                throw new Error('Failed to fetch integrity token');
            }

            const integrityToken = await integrityTokenRes.text();
            const response = await fetch(siteUrl + '/members/api/send-magic-link/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({...reqBody, integrityToken})
            });

            if (!response.ok) {
                setSubscribeFormState('idle');
                let message = messages.genericError;

                try {
                    const body = await response.json();
                    message = normalizeSubscribeErrorMessage(body?.errors?.[0]) || message;
                } catch (error) {
                    // Ignore parse failures and use the default message.
                }

                setSubscribeFeedback(message, 'error');
                return;
            }

            subscribeInput.value = '';
            setSubscribeFeedback(messages.confirmEmail, 'idle');
            setSubscribeFormState('success');
            subscribeSuccessTimeout = window.setTimeout(function () {
                setSubscribeFormState('idle');
            }, successResetDelay);
        } catch (error) {
            setSubscribeFormState('idle');
            setSubscribeFeedback(messages.genericError, 'error');
        }
    });
}());
