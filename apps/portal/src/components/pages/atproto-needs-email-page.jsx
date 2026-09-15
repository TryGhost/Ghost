import React from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import Interpolate from '@doist/react-interpolate';
import {t} from '../../utils/i18n';

const AtprotoNeedsEmailStyles = `
    .gh-portal-atproto-needs-email {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .gh-portal-atproto-needs-email .gh-portal-header {
        padding-bottom: 12px;
    }

    .gh-portal-atproto-needs-email .gh-portal-input {
        margin-bottom: 16px;
    }

    .gh-portal-atproto-needs-email .gh-portal-input-error {
        margin-top: 8px;
        color: var(--red);
        font-size: 1.3rem;
        letter-spacing: 0.35px;
        line-height: 1.6em;
        margin-bottom: 12px;
    }

    .gh-portal-atproto-needs-email p {
        max-width: 420px;
        text-align: center;
        margin-bottom: 20px;
    }
`;

export default class AtprotoNeedsEmailPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            email: '',
            errors: {},
            isLoading: false,
            submitted: false
        };
    }

    componentDidMount() {
        const {pageData} = this.context;
        if (!pageData || !pageData.pending) {
            // No pending session, redirect to signup
            this.context.doAction('switchPage', {page: 'signup'});
        }
    }

    handleEmailChange = (e) => {
        this.setState({
            email: e.target.value,
            errors: {}
        });
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        const {email} = this.state;
        const {pageData} = this.context;

        // Basic validation
        if (!email) {
            this.setState({
                errors: {email: t('Please enter an email address')}
            });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.setState({
                errors: {email: t('Please enter a valid email address')}
            });
            return;
        }

        this.setState({isLoading: true});

        try {
            const response = await fetch('/members/atproto/needs-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pending: pageData.pending,
                    email: email
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.errors?.[0]?.message || t('An error occurred'));
            }

            // Email submitted successfully, show success state
            this.setState({isLoading: false, submitted: true});
        } catch (error) {
            this.setState({
                errors: {email: error.message},
                isLoading: false
            });
        }
    };

    render() {
        const {email, errors, isLoading, submitted} = this.state;
        const {site, member} = this.context;

        // If user is already logged in, they shouldn't be on this page
        if (member && member.email) {
            this.context.doAction('switchPage', {page: 'accountHome'});
            return null;
        }

        if (submitted) {
            return (
                <div>
                    <style>{AtprotoNeedsEmailStyles}</style>
                    <CloseButton />
                    <div className='gh-portal-atproto-needs-email'>
                        <h2 className='gh-portal-header'>{t('Check your email')}</h2>
                        <p>
                            <Interpolate
                                string={t('A confirmation link has been sent to {email}. Click it to complete your sign up.')}
                                mapping={{
                                    email: <strong>{email}</strong>
                                }}
                            />
                        </p>
                        <p style={{fontSize: '1.2rem', color: '#999', marginTop: '20px'}}>
                            {t('If you don\'t see the email, check your spam folder.')}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div>
                <style>{AtprotoNeedsEmailStyles}</style>
                <CloseButton />
                <div className='gh-portal-atproto-needs-email'>
                    <h2 className='gh-portal-header'>{t('Complete your sign up')}</h2>
                    <p>{t('Your Bluesky account doesn\'t have a verified email. Please enter an email address to complete your sign up.')}</p>

                    <form onSubmit={this.handleSubmit}>
                        <input
                            className='gh-portal-input'
                            type='email'
                            placeholder={t('your@email.com')}
                            value={email}
                            onChange={this.handleEmailChange}
                            disabled={isLoading}
                            autoFocus
                        />
                        {errors.email && (
                            <p className='gh-portal-input-error'>{errors.email}</p>
                        )}

                        <ActionButton
                            onClick={this.handleSubmit}
                            disabled={isLoading}
                            isLoading={isLoading}
                        >
                            {isLoading ? t('Sending...') : t('Continue')}
                        </ActionButton>
                    </form>
                </div>
            </div>
        );
    }
}
