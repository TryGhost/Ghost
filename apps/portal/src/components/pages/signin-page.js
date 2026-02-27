import React from 'react';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
// import SiteTitleBackButton from '../common/SiteTitleBackButton';
import AppContext from '../../app-context';
import InputForm from '../common/input-form';
import {ValidateInputForm} from '../../utils/form';
import {hasAvailablePrices, isSigninAllowed, isSignupAllowed} from '../../utils/helpers';
import {ReactComponent as InvitationIcon} from '../../images/icons/invitation.svg';
import {t} from '../../utils/i18n';

export default class SigninPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            email: '',
            token: undefined,
            blueskyHandle: '',
            showBlueskyInput: false
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (member) {
            this.context.doAction('switchPage', {
                page: 'accountHome'
            });
        }
    }

    handleSignin(e) {
        e.preventDefault();
        this.doSignin();
    }

    doSignin() {
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, async () => {
            const {email, phonenumber, errors, token} = this.state;
            const {redirect} = this.context.pageData ?? {};
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                this.context.doAction('signin', {email, phonenumber, redirect, token});
            }
        });
    }

    handleBlueskySignin(e) {
        e.preventDefault();
        const {blueskyHandle} = this.state;
        if (blueskyHandle && blueskyHandle.trim()) {
            this.context.doAction('signinWithBluesky', {handle: blueskyHandle.trim()});
        }
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        this.setState({
            [fieldName]: e.target.value
        });
    }

    onKeyDown(e) {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            this.handleSignin(e);
        }
    }

    onBlueskyKeyDown(e) {
        if (e.keyCode === 13) {
            this.handleBlueskySignin(e);
        }
    }

    getInputFields({state}) {
        const errors = state.errors || {};
        const fields = [
            {
                type: 'email',
                value: state.email,
                placeholder: t('jamie@example.com'),
                label: t('Email'),
                name: 'email',
                required: true,
                errorMessage: errors.email || '',
                autoFocus: true
            },
            {
                type: 'text',
                value: state.phonenumber,
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

    renderSubmitButton() {
        const {action} = this.context;
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
                onClick={e => this.handleSignin(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
                isRunning={isRunning}
            />
        );
    }

    renderBlueskyLogin() {
        const {site, action} = this.context;
        if (!site.atproto_oauth_enabled) {
            return null;
        }

        const isRunning = (action === 'signinWithBluesky:running');
        const {showBlueskyInput} = this.state;

        if (!showBlueskyInput) {
            return (
                <div className='gh-portal-bluesky-section'>
                    <div className='gh-portal-divider'>
                        <span className='gh-portal-divider-line'></span>
                        <span className='gh-portal-divider-text'>{t('or')}</span>
                        <span className='gh-portal-divider-line'></span>
                    </div>
                    <button
                        data-test-button='bluesky-signin'
                        className='gh-portal-btn gh-portal-btn-bluesky'
                        onClick={() => this.setState({showBlueskyInput: true})}
                        style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                    >
                        <BlueskySvg />
                        <span>{t('Sign in with Bluesky')}</span>
                    </button>
                </div>
            );
        }

        return (
            <div className='gh-portal-bluesky-section'>
                <div className='gh-portal-divider'>
                    <span className='gh-portal-divider-line'></span>
                    <span className='gh-portal-divider-text'>{t('or')}</span>
                    <span className='gh-portal-divider-line'></span>
                </div>
                <div className='gh-portal-bluesky-input' style={{marginBottom: '12px'}}>
                    <label className='gh-portal-input-label' style={{marginBottom: '4px', display: 'block'}}>
                        {t('Bluesky Handle')}
                    </label>
                    <input
                        data-test-input='bluesky-handle'
                        type='text'
                        className='gh-portal-input'
                        value={this.state.blueskyHandle}
                        placeholder='yourname.bsky.social'
                        onChange={e => this.setState({blueskyHandle: e.target.value})}
                        onKeyDown={e => this.onBlueskyKeyDown(e)}
                        autoFocus
                    />
                </div>
                <ActionButton
                    dataTestId='bluesky-signin-submit'
                    style={{width: '100%'}}
                    onClick={e => this.handleBlueskySignin(e)}
                    disabled={isRunning || !this.state.blueskyHandle.trim()}
                    brandColor={this.context.brandColor}
                    label={isRunning ? t('Redirecting...') : t('Continue with Bluesky')}
                    isRunning={isRunning}
                />
            </div>
        );
    }

    renderSignupMessage() {
        const {brandColor} = this.context;
        return (
            <div className='gh-portal-signup-message'>
                <div>{t('Don\'t have an account?')}</div>
                <button
                    data-test-button='signup-switch'
                    className='gh-portal-btn gh-portal-btn-link'
                    style={{color: brandColor}}
                    onClick={() => this.context.doAction('switchPage', {page: 'signup'})}
                >
                    <span>{t('Sign up')}</span>
                </button>
            </div>
        );
    }

    renderForm() {
        const {site} = this.context;
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
                        fields={this.getInputFields({state: this.state})}
                        onChange={(e, field) => this.handleInputChange(e, field)}
                        onKeyDown={(e, field) => this.onKeyDown(e, field)}
                    />
                </div>
                <footer className='gh-portal-signin-footer'>
                    {this.renderSubmitButton()}
                    {this.renderBlueskyLogin()}
                    {isSignupAvailable && this.renderSignupMessage()}
                </footer>
            </section>
        );
    }

    renderSiteIcon() {
        const iconStyle = {};
        const {site} = this.context;
        const siteIcon = site.icon;

        if (siteIcon) {
            iconStyle.backgroundImage = `url(${siteIcon})`;
            return (
                <img className='gh-portal-signup-logo' src={siteIcon} alt={this.context.site.title} />
            );
        } else if (!isSigninAllowed({site})) {
            return (
                <InvitationIcon className='gh-portal-icon gh-portal-icon-invitation' />
            );
        }
        return null;
    }

    renderSiteTitle() {
        const {site} = this.context;
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
    }

    renderFormHeader() {
        return (
            <header className='gh-portal-signin-header'>
                {this.renderSiteIcon()}
                {this.renderSiteTitle()}
            </header>
        );
    }

    render() {
        return (
            <>
                <CloseButton />
                <div className='gh-portal-logged-out-form-container'>
                    <div className='gh-portal-content signin'>
                        {this.renderFormHeader()}
                        {this.renderForm()}
                    </div>
                </div>
            </>
        );
    }
}

function BlueskySvg() {
    return (
        <svg width="20" height="20" viewBox="0 0 600 530" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
        </svg>
    );
}
