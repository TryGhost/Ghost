import React from 'react';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import AppContext from '../../AppContext';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';

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
        margin-bottom: 30px;
    }
`;

const OTC_FIELD_NAME = 'otc';

export default class MagicLinkPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            [OTC_FIELD_NAME]: ''
        };
    }

    renderFormHeader() {
        const {t} = this.context;

        let popupTitle = t(`Now check your email!`);
        let popupDescription = t(`A login link has been sent to your inbox. If it doesn't arrive in 3 minutes, be sure to check your spam folder.`);

        if (this.context.lastPage === 'signup') {
            popupTitle = t(`Now check your email!`);
            popupDescription = t(`To complete signup, click the confirmation link in your inbox. If it doesn't arrive within 3 minutes, check your spam folder!`);
        }

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

    renderLoginMessage() {
        const {t} = this.context;

        return (
            <>
                <div
                    style={{color: '#1d1d1d', fontWeight: 'bold', cursor: 'pointer'}}
                    onClick={() => this.context.onAction('switchPage', {page: 'signin'})}
                >
                    {t('Back to Log in')}
                </div>
            </>
        );
    }

    handleClose() {
        this.context.onAction('closePopup');
    }

    renderCloseButton() {
        const {t} = this.context;

        const label = t('Close');
        return (
            <ActionButton
                style={{width: '100%'}}
                onClick={e => this.handleClose(e)}
                brandColor={this.context.brandColor}
                label={label}
            />
        );
    }

    getInputFields({state}) {
        const {t} = this.context;
        const errors = state.errors || {};

        return [
            {
                id: OTC_FIELD_NAME,
                name: OTC_FIELD_NAME,
                type: 'text',
                value: state.otc,
                placeholder: '• • • • • •',
                label: t('Enter one-time code'),
                required: true,
                errorMessage: errors.otc || '',
                autoFocus: false,
                maxlength: 6,
                pattern: '[0-9]*',
                inputmode: 'numeric',
                autocomplete: 'one-time-code',
                class: 'gh-input'
            }
        ];
    }

    handleSubmit(e) {
        e.preventDefault();
        this.doVerifyOTC();
    }

    doVerifyOTC() {
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state}), t: this.context.t})
            };
        }, async () => {
            const {otc, errors} = this.state;
            const {otcRef} = this.context;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors && otcRef) {
                // @TODO: replace with verifyOTC action
                // For now, just log the values for development
                // eslint-disable-next-line no-console
                console.log(`token: ${otcRef} otc: ${otc}`);
            }
        });
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
            this.handleSubmit(e);
        }
    }

    renderOTCForm() {
        const {t, action, labs, otcRef} = this.context;

        if (!labs.membersSigninOTC || !otcRef) {
            return null;
        }

        const isRunning = (action === 'verifyOTC:running');
        const isError = (action === 'verifyOTC:failed');

        return (
            <section>
                <div className='gh-portal-section'>
                    <div>{t('You can also use the one-time code to sign in here.')}</div>
                    <InputForm
                        fields={this.getInputFields({state: this.state})}
                        onChange={(e, field) => this.handleInputChange(e, field)}
                        onKeyDown={(e, field) => this.onKeyDown(e, field)}
                    />
                </div>
                <footer className='gh-portal-signin-footer'>
                    <ActionButton
                        style={{width: '100%'}}
                        onClick={e => this.handleSubmit(e)}
                        brandColor={this.context.brandColor}
                        label={isRunning ? t('Verifying...') : t('Verify Code')}
                        isRunning={isRunning}
                        retry={isError}
                        disabled={isRunning}
                    />
                </footer>
            </section>
        );
    }

    render() {
        const {labs, otcRef} = this.context;
        const showOTCForm = labs?.membersSigninOTC && otcRef;

        return (
            <div className='gh-portal-content'>
                <CloseButton />
                {this.renderFormHeader()}
                {showOTCForm ? this.renderOTCForm() : this.renderCloseButton()}
            </div>
        );
    }
}
