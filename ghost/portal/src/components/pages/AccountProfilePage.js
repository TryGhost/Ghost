import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';
import Switch from '../common/Switch';

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
        const {email, name} = this.state;
        const originalEmail = this.context.member.email;
        if (email !== originalEmail) {
            this.context.onAction('updateEmail', {email, oldEmail: originalEmail, emailType: 'updateEmail'});
        }
        this.context.onAction('updateMember', {email, name});
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
            <div style={{cursor: 'pointer', color: 'red'}} role='button'> Delete Account </div>
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
                <MemberAvatar gravatar={avatarImg} style={{userIcon: {color: 'black', width: '45px', height: '45px'}}} />
            </div>
        );
    }

    handleInput(e, field) {
        this.setState({
            [field]: e.target.value
        });
    }

    renderInputField(fieldName) {
        const fields = {
            name: {
                type: 'text',
                value: this.state.name,
                placeholder: 'Name...',
                label: 'Name',
                name: 'name',
                brandColor: this.context.brandColor
            },
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'Email...',
                label: 'Email',
                name: 'email',
                brandColor: this.context.brandColor
            }
        };
        const field = fields[fieldName];
        return (
            <InputField
                {...field}
                onChange={(e, name) => this.handleInput(e, name)}
            />
        );
    }

    renderProfileData() {
        return (
            <div className='gh-portal-section'>
                {this.renderInputField('name')}
                {this.renderInputField('email')}
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
            <div className='gh-portal-freeaccount-newsletter' style={{marginTop: '24px'}}>
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