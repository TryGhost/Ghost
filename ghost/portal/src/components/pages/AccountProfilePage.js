import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import InputForm from '../common/InputForm';
import Switch from '../common/Switch';
import {ValidateInputForm} from '../../utils/form';

const React = require('react');

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
                page: 'signup'
            });
        }
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    onBack(e) {
        this.context.onAction('back');
    }

    onProfileSave(e) {
        e.preventDefault();
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, () => {
            const {email, name, errors} = this.state;
            const originalEmail = this.context.member.email;

            if (!(errors && Object.keys(errors).length > 0)) {
                if (email !== originalEmail) {
                    this.context.onAction('updateEmail', {email, oldEmail: originalEmail, emailType: 'updateEmail'});
                }
                this.context.onAction('updateMember', {email, name});
            }
        });
    }

    renderSaveButton() {
        const isRunning = (this.context.action === 'updateMember:running');
        const isSaved = (this.context.action === 'updateMember:success');
        let label = 'Save';
        if (isRunning) {
            label = 'Saving';
        } else if (isSaved) {
            label = 'Saved';
        }
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
                style={{button: {width: 'unset'}}}
                onClick={e => this.onProfileSave(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
            />
        );
    }

    renderDeleteAccountButton() {
        return (
            <div style={{cursor: 'pointer', color: 'red'}} role='button'>Delete account</div>
        );
    }

    renderAccountFooter() {
        return (
            <footer className='gh-portal-action-footer'>
                <button className='gh-portal-btn' onClick={e => this.onBack(e)}>Cancel</button>
                {this.renderSaveButton()}
            </footer>
        );
    }

    renderHeader() {
        return (
            <header className='gh-portal-detail-header'>
                <h3 className='gh-portal-main-title'>Account settings</h3>
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

    handleInputBlur(e) {
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        });
    }

    getInputFields({state}) {
        const errors = state.errors || {};
        const fields = [
            {
                type: 'text',
                value: state.name,
                placeholder: 'Jamie Larson',
                label: 'Name',
                name: 'name',
                required: true,
                errorMessage: errors.name || ''
            },
            {
                type: 'email',
                value: state.email,
                placeholder: 'jamie@example.com',
                label: 'Email',
                name: 'email',
                required: true,
                errorMessage: errors.email || ''
            }
        ];

        return fields;
    }

    renderProfileData() {
        return (
            <div className='gh-portal-section'>
                <InputForm
                    fields={this.getInputFields({state: this.state})}
                    onChange={(e, field) => this.handleInputChange(e, field)}
                    onBlur={(e, field) => this.handleInputBlur(e, field)}
                />
            </div>
        );
    }

    onToggleSubscription(e, subscribed) {
        this.context.onAction('updateMember', {subscribed: !subscribed});
    }

    renderNewsletterOption() {
        const {subscribed, paid} = this.context.member;
        if (paid) {
            return null;
        }
        const label = subscribed ? 'Subscribed to email newsletters' : 'Not subscribed to email newsletters';
        return (
            <div className='gh-portal-freeaccount-newsletter'>
                <div className='label'>
                    <h3 className='gh-portal-input-label'>Newsletter</h3>
                    <div className='gh-portal-setting-data'>{label}</div>
                </div>
                <div>
                    <Switch onToggle={(e) => {
                        this.onToggleSubscription(e, subscribed);
                    }} checked={subscribed} />
                </div>
            </div>
        );
    }

    render() {
        const {member} = this.context;
        if (!member) {
            return null;
        }
        return (
            <div>
                {this.renderHeader()}
                <div className='gh-portal-section'>
                    {this.renderProfileData()}
                    {this.renderNewsletterOption()}
                </div>
                {this.renderAccountFooter()}
            </div>
        );
    }
}