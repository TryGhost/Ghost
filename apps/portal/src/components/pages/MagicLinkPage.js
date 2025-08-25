import React from 'react';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import AppContext from '../../AppContext';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';

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

export default class MagicLinkPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            otc: ''
        };
    }

    renderFormHeader() {
        const {t} = this.context;

        let popupTitle = t(`Now check your email!!!!!!!!`);
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

    handleOTCInputChange(e, field) {
        const fieldName = field.name;
        this.setState({
            [fieldName]: e.target.value
        });
    }

    handleOTCSubmit(e) {
        e.preventDefault();
        this.doVerifyOTC();
    }

    doVerifyOTC() {
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getOTCInputFields({state}), t: this.context.t})
            };
        }, async () => {
            const {otc, errors} = this.state;
            const {otcRef} = this.context;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            
            if (!hasFormErrors && otcRef) {
                this.context.onAction('verifyOTC', {otc, otc_ref: otcRef});
            }
        });
    }

    getOTCInputFields({state}) {
        const {t} = this.context;
        const errors = state.errors || {};
        
        return [
            {
                type: 'text',
                value: state.otc,
                placeholder: '123456',
                label: t('Enter verification code'),
                name: 'otc',
                required: true,
                errorMessage: errors.otc || '',
                autoFocus: false,
                maxLength: 6,
                pattern: '[0-9]*'
            }
        ];
    }

    onOTCKeyDown(e) {
        // Submit on Enter press
        if (e.keyCode === 13) {
            this.handleOTCSubmit(e);
        }
    }

    renderOTCForm() {
        const {t, action, otcRef} = this.context;
        
        // Only show OTC form if we have an otcRef
        if (!otcRef) {
            return null;
        }

        const isRunning = (action === 'verifyOTC:running');
        const isError = (action === 'verifyOTC:failed');
        
        return (
            <div style={{marginTop: '30px', paddingTop: '30px', borderTop: '1px solid #e0e0e0'}}>
                <h3 style={{textAlign: 'center', marginBottom: '20px', fontSize: '16px', color: '#1d1d1d'}}>
                    {t('Or enter verification code')}
                </h3>
                <div className='gh-portal-section'>
                    <InputForm
                        fields={this.getOTCInputFields({state: this.state})}
                        onChange={(e, field) => this.handleOTCInputChange(e, field)}
                        onKeyDown={(e, field) => this.onOTCKeyDown(e, field)}
                    />
                </div>
                <ActionButton
                    style={{width: '100%', marginTop: '16px'}}
                    onClick={e => this.handleOTCSubmit(e)}
                    brandColor={this.context.brandColor}
                    label={isRunning ? t('Verifying...') : t('Verify Code')}
                    isRunning={isRunning}
                    retry={isError}
                    disabled={isRunning}
                />
            </div>
        );
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

    render() {
        return (
            <div className='gh-portal-content'>
                <CloseButton />
                {this.renderFormHeader()}
                {this.renderOTCForm()}
                {this.renderCloseButton()}
            </div>
        );
    }
}
