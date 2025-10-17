import {useContext, useState} from 'react';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import AppContext from '../../AppContext';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';
import {t} from '../../utils/i18n';

export const MagicLinkStyles = `
    .gh-portal-icon-envelope {
        width: 44px;
        margin: 12px 0 10px;
    }

    .gh-portal-inbox-notification {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .gh-portal-inbox-notification p {
        max-width: 420px;
        text-align: center;
        margin-bottom: 20px;
    }

    .gh-portal-inbox-notification .gh-portal-header {
        padding-bottom: 12px;
    }

    .gh-portal-otp {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 12px;
    }

    .gh-portal-otp-container {
        border: 1px solid var(--grey12);
        border-radius: 8px;
        width: 100%;
        transition: border-color 0.25s ease;
    }

    .gh-portal-otp-container.focused {
        border-color: var(--grey8);
    }

    .gh-portal-otp-container.error {
        border-color: var(--red);
        box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
    }

    .gh-portal-otp .gh-portal-input {
        margin: 0 auto;
        font-size: 2rem !important;
        font-weight: 300;
        border: none;
        /*text-align: center;*/
        padding-left: 2ch;
        padding-right: 1ch;
        letter-spacing: 1ch;
        font-family: Consolas, Liberation Mono, Menlo, Courier, monospace;
        width: 15ch;
    }

    .gh-portal-otp-error {
        margin-top: 8px;
        color: var(--red);
        font-size: 1.3rem;
        letter-spacing: 0.35px;
        line-height: 1.6em;
        margin-bottom: 0;
    }
`;

const OTC_FIELD_NAME = 'otc';

/**
 * Generates configuration object containing translated description messages for magic link scenarios
 * @param {string} submittedEmailOrInbox - The email address or fallback text ('your inbox')
 * @returns {Object} Configuration object with message templates for signin/signup scenarios
 */
function getDescriptionConfig(submittedEmailOrInbox) {
    return {
        signin: {
            withOTC: t('An email has been sent to {submittedEmailOrInbox}. Click the link inside or enter your code below.', {submittedEmailOrInbox}),
            withoutOTC: t('A login link has been sent to your inbox. If it doesn\'t arrive in 3 minutes, be sure to check your spam folder.')
        },
        signup: t('To complete signup, click the confirmation link in your inbox. If it doesn\'t arrive within 3 minutes, check your spam folder!')
    };
}

/**
 * Gets the appropriate translated description based on page context
 * @param {Object} params - Configuration object
 * @param {string} params.lastPage - The previous page ('signin' or 'signup')
 * @param {boolean} params.otcRef - Whether one-time code is being used
 * @param {string} params.submittedEmailOrInbox - The email address or 'your inbox' fallback
 * @returns {string} The translated description
 */
function getTranslatedDescription({lastPage, otcRef, submittedEmailOrInbox}) {
    const descriptionConfig = getDescriptionConfig(submittedEmailOrInbox);
    const normalizedPage = (lastPage === 'signup' || lastPage === 'signin') ? lastPage : 'signin';

    if (normalizedPage === 'signup') {
        return descriptionConfig.signup;
    }

    return otcRef ? descriptionConfig.signin.withOTC : descriptionConfig.signin.withoutOTC;
}

function FormHeader({otcRef, pageData, lastPage}) {
    const submittedEmailOrInbox = pageData?.email ? pageData.email : t('your inbox');

    const popupTitle = t(`Now check your email!`);
    const popupDescription = getTranslatedDescription({
        lastPage,
        otcRef,
        submittedEmailOrInbox
    });

    return (
        <section className='gh-portal-inbox-notification'>
            <header className='gh-portal-header'>
                <EnvelopeIcon className='gh-portal-icon gh-portal-icon-envelope' />
                <h2 className='gh-portal-main-title'>{popupTitle}</h2>
            </header>
            <p>{popupDescription}</p>
        </section>
    );
}

export default function MagicLinkPage() {
    const context = useContext(AppContext);
    const {otcRef, pageData, lastPage, action, actionErrorMessage, labs, brandColor, doAction} = context;

    const [otc, setOtc] = useState('');
    const [errors, setErrors] = useState({});
    const [isFocused, setIsFocused] = useState(false);

    const handleClose = () => {
        doAction('closePopup');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const isRunning = (action === 'verifyOTC:running');

        if (!isRunning) {
            doVerifyOTC();
        }
    };

    const doVerifyOTC = () => {
        const missingCodeError = t('Enter code above');
        const code = (otc || '').trim();
        const newErrors = {
            [OTC_FIELD_NAME]: code ? '' : missingCodeError
        };

        setErrors(newErrors);

        const hasFormErrors = Object.values(newErrors).filter(d => !!d).length > 0;
        const {redirect} = pageData ?? {};

        if (!hasFormErrors && otcRef) {
            doAction('verifyOTC', {otc, otcRef, redirect});
        }
    };

    const handleInputChange = (e, field) => {
        const fieldName = field.name;
        const value = e.target.value;

        // For OTC field, only allow numeric input
        if (fieldName === OTC_FIELD_NAME) {
            const numericValue = value.replace(/[^0-9]/g, '');
            setOtc(numericValue);
        }
    };

    const renderCloseButton = () => {
        const label = t('Close');
        return (
            <ActionButton
                style={{width: '100%'}}
                onClick={handleClose}
                brandColor={brandColor}
                label={label}
            />
        );
    };

    const renderOTCForm = () => {
        if (!labs?.membersSigninOTC || !otcRef) {
            return null;
        }

        const isRunning = (action === 'verifyOTC:running');
        const isError = (action === 'verifyOTC:failed');

        const error = (isError && actionErrorMessage) ? actionErrorMessage : errors.otc;

        return (
            <form onSubmit={handleSubmit}>
                <section className='gh-portal-section gh-portal-otp'>
                    <div className={`gh-portal-otp-container ${isFocused && 'focused'} ${error && 'error'}`}>
                        <input
                            id={`input-${OTC_FIELD_NAME}`}
                            className={`gh-portal-input ${otc && 'entry'} ${error && 'error'}`}
                            placeholder='––––––'
                            name={OTC_FIELD_NAME}
                            type="text"
                            value={otc}
                            inputMode="numeric"
                            maxLength={6}
                            pattern="[0-9]*"
                            autoComplete="one-time-code"
                            autoCorrect="off"
                            autoCapitalize="off"
                            autoFocus={true}
                            aria-label={t('Code')}
                            onChange={e => handleInputChange(e, {name: OTC_FIELD_NAME})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </div>
                    {error &&
                        <div className="gh-portal-otp-error">
                            {error}
                        </div>
                    }
                </section>

                <footer className='gh-portal-signin-footer'>
                    <ActionButton
                        style={{width: '100%'}}
                        onClick={handleSubmit}
                        brandColor={brandColor}
                        label={isRunning ? t('Verifying...') : t('Continue')}
                        isRunning={isRunning}
                        retry={isError}
                        disabled={isRunning}
                    />
                </footer>
            </form>
        );
    };

    const showOTCForm = labs?.membersSigninOTC && otcRef;

    return (
        <div className='gh-portal-content'>
            <CloseButton />
            <FormHeader otcRef={otcRef} pageData={pageData} lastPage={lastPage} />
            {showOTCForm ? renderOTCForm() : renderCloseButton()}
        </div>
    );
}
