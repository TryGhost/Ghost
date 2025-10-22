import React, {useContext, useState, useEffect} from 'react';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import AppContext from '../../AppContext';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';
import {hasAvailablePrices, isSigninAllowed, isSignupAllowed} from '../../utils/helpers';
import {ReactComponent as InvitationIcon} from '../../images/icons/invitation.svg';
import {t} from '../../utils/i18n';

function getInputFields({email, phonenumber, errors = {}}) {
    const fields = [
        {
            type: 'email',
            value: email,
            placeholder: 'jamie@example.com',
            label: t('Email'),
            name: 'email',
            required: true,
            errorMessage: errors.email || '',
            autoFocus: true
        },
        {
            type: 'text',
            value: phonenumber,
            placeholder: '+1 (123) 456-7890',
            // Doesn't need translation, hidden field
            label: 'Phone number',
            name: 'phonenumber',
            required: false,
            tabIndex: -1,
            autoComplete: 'off',
            hidden: true
        }
    ];
    return fields;
}

function SigninPage() {
    const {member, site, action, brandColor, pageData, doAction} = useContext(AppContext);

    const [email, setEmail] = useState('');
    const [phonenumber, setPhonenumber] = useState(undefined);
    const [token, setToken] = useState(undefined);
    const [errors, setErrors] = useState({});

    // Redirect to account home if already logged in
    useEffect(() => {
        if (member) {
            doAction('switchPage', {
                page: 'accountHome'
            });
        }
    }, [member, doAction]);

    const handleInputChange = (e, field) => {
        const fieldName = field.name;
        if (fieldName === 'email') {
            setEmail(e.target.value);
        } else if (fieldName === 'phonenumber') {
            setPhonenumber(e.target.value);
        }
    };

    const doSignin = () => {
        const fields = getInputFields({email, phonenumber, errors});
        const validationErrors = ValidateInputForm({fields});
        setErrors(validationErrors);

        const {redirect} = pageData ?? {};
        const hasFormErrors = (validationErrors && Object.values(validationErrors).filter(d => !!d).length > 0);
        if (!hasFormErrors) {
            doAction('signin', {email, phonenumber, redirect, token});
        }
    };

    const handleSignin = (e) => {
        e.preventDefault();
        doSignin();
    };

    const onKeyDown = (e) => {
        // Handles submit on Enter press
        if (e.keyCode === 13) {
            handleSignin(e);
        }
    };

    const renderSubmitButton = () => {
        let retry = false;
        const isRunning = (action === 'signin:running');
        let label = isRunning ? t('Sending login link...') : t('Continue');
        const disabled = isRunning ? true : false;
        if (action === 'signin:failed') {
            label = t('Retry');
            retry = true;
        }
        return (
            <ActionButton
                dataTestId='signin'
                retry={retry}
                style={{width: '100%'}}
                onClick={e => handleSignin(e)}
                disabled={disabled}
                brandColor={brandColor}
                label={label}
                isRunning={isRunning}
            />
        );
    };

    const renderSignupMessage = () => {
        return (
            <div className='gh-portal-signup-message'>
                <div>{t('Don\'t have an account?')}</div>
                <button
                    data-test-button='signup-switch'
                    className='gh-portal-btn gh-portal-btn-link'
                    style={{color: brandColor}}
                    onClick={() => doAction('switchPage', {page: 'signup'})}
                >
                    <span>{t('Sign up')}</span>
                </button>
            </div>
        );
    };

    const renderForm = () => {
        const isSignupAvailable = isSignupAllowed({site}) && hasAvailablePrices({site});

        if (!isSigninAllowed({site})) {
            return (
                <section>
                    <div className='gh-portal-section'>
                        <p
                            className='gh-portal-members-disabled-notification'
                            data-testid="members-disabled-notification-text"
                        >
                            {t('Memberships unavailable, contact the owner for access.')}
                        </p>
                    </div>
                </section>
            );
        }

        return (
            <section>
                <div className='gh-portal-section'>
                    <InputForm
                        fields={getInputFields({email, phonenumber, errors})}
                        onChange={(e, field) => handleInputChange(e, field)}
                        onKeyDown={(e, field) => onKeyDown(e, field)}
                    />
                </div>
                <footer className='gh-portal-signin-footer'>
                    {renderSubmitButton()}
                    {isSignupAvailable && renderSignupMessage()}
                </footer>
            </section>
        );
    };

    const renderSiteIcon = () => {
        const siteIcon = site.icon;

        if (siteIcon) {
            return (
                <img className='gh-portal-signup-logo' src={siteIcon} alt={site.title} />
            );
        } else if (!isSigninAllowed({site})) {
            return (
                <InvitationIcon className='gh-portal-icon gh-portal-icon-invitation' />
            );
        }
        return null;
    };

    const renderSiteTitle = () => {
        const siteTitle = site.title;

        if (!isSigninAllowed({site})) {
            return (
                <h1 className='gh-portal-main-title'>{siteTitle}</h1>
            );
        } else {
            return (
                <h1 className='gh-portal-main-title'>{t('Sign in')}</h1>
            );
        }
    };

    const renderFormHeader = () => {
        return (
            <header className='gh-portal-signin-header'>
                {renderSiteIcon()}
                {renderSiteTitle()}
            </header>
        );
    };

    return (
        <>
            <CloseButton />
            <div className='gh-portal-logged-out-form-container'>
                <div className='gh-portal-content signin'>
                    {renderFormHeader()}
                    {renderForm()}
                </div>
            </div>
        </>
    );
}

export default SigninPage;
