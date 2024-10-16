import React from 'react';
import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';

export default class AccountProfilePage extends React.Component {
    static contextType = AppContext;

    constructor(props, context) {
        super(props, context);
        const {name = '', email = ''} = context.member || {};
        this.state = {
            name,
            email
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (!member) {
            this.context.onAction('switchPage', {
                page: 'signin'
            });
        }
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    onBack() {
        this.context.onAction('back');
    }

    onProfileSave(e) {
        e.preventDefault();
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state}), t: this.context.t})
            };
        }, () => {
            const {email, name, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                this.context.onAction('clearPopupNotification');
                this.context.onAction('updateProfile', {email, name});
            }
        });
    }

    renderSaveButton() {
        const {t} = this.context;

        const isRunning = (this.context.action === 'updateProfile:running');
        let label = t('Save');
        if (this.context.action === 'updateProfile:failed') {
            label = t('Retry');
        }
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
                dataTestId={'save-button'}
                isRunning={isRunning}
                onClick={e => this.onProfileSave(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
                style={{width: '100%'}}
            />
        );
    }

    renderDeleteAccountButton() {
        const {t} = this.context;

        return (
            <div style={{cursor: 'pointer', color: 'red'}} role='button'>{t('Delete account')}</div>
        );
    }

    renderAccountFooter() {
        return (
            <footer className='gh-portal-action-footer'>
                {this.renderSaveButton()}
            </footer>
        );
    }

    renderHeader() {
        const {t} = this.context;

        return (
            <header className='gh-portal-detail-header'>
                <BackButton brandColor={this.context.brandColor} hidden={!this.context.lastPage} onClick={e => this.onBack(e)} />
                <h3 className='gh-portal-main-title'>{t('Account settings')}</h3>
            </header>
        );
    }

    renderUserAvatar() {
        const avatarImg = (this.context.member && this.context.member.avatar_image);

        const avatarContainerStyle = {
            position: 'relative',
            display: 'flex',
            width: '64px',
            height: '64px',
            marginBottom: '6px',
            borderRadius: '100%',
            boxShadow: '0 0 0 3px #fff',
            border: '1px solid gray',
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center'
        };

        return (
            <div style={avatarContainerStyle}>
                <MemberAvatar gravatar={avatarImg} style={{userIcon: {color: 'black', width: '56px', height: '56px'}}} />
            </div>
        );
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        this.setState({
            [fieldName]: e.target.value
        });
    }

    getInputFields({state, fieldNames}) {
        const {t} = this.context;

        const errors = state.errors || {};
        const fields = [
            {
                type: 'text',
                value: state.name,
                placeholder: t('Jamie Larson'),
                label: t('Name'),
                name: 'name',
                required: true,
                errorMessage: errors.name || ''
            },
            {
                type: 'email',
                value: state.email,
                placeholder: t('jamie@example.com'),
                label: t('Email'),
                name: 'email',
                required: true,
                errorMessage: errors.email || ''
            }
        ];
        if (fieldNames && fieldNames.length > 0) {
            return fields.filter((f) => {
                return fieldNames.includes(f.name);
            });
        }
        return fields;
    }

    onKeyDown(e) {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            this.onProfileSave(e);
        }
    }

    renderProfileData() {
        return (
            <div className='gh-portal-section'>
                <InputForm
                    fields={this.getInputFields({state: this.state})}
                    onChange={(e, field) => this.handleInputChange(e, field)}
                    onKeyDown={(e, field) => this.onKeyDown(e, field)}
                />
            </div>
        );
    }

    render() {
        const {member} = this.context;
        if (!member) {
            return null;
        }
        return (
            <>
                <div className='gh-portal-content with-footer'>
                    <CloseButton />
                    {this.renderHeader()}
                    <div className='gh-portal-section'>
                        {this.renderProfileData()}
                    </div>
                </div>
                {this.renderAccountFooter()}
            </>
        );
    }
}
