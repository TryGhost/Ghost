import {ParentContext} from '../ParentContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';
import Switch from '../common/Switch';

const React = require('react');

export default class AccountProfilePage extends React.Component {
    static contextType = ParentContext;

    constructor(props, context) {
        super(props, context);
        this.state = {
            name: this.context.member.name || '',
            email: this.context.member.email || ''
        };
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
        this.context.onAction('profileSave', {email, name});
    }

    renderAccountFooter() {
        return (
            <div style={{display: 'flex', padding: '0 24px', marginTop: '42px', color: this.context.brandColor, fontWeight: 'bold', fontSize: '13px', alignItems: 'center'}}>
                <div style={{cursor: 'pointer', color: 'red'}} role='button'> Delete Account </div>
                <div style={{display: 'flex', flexGrow: 1, justifyContent: 'flex-end'}}>
                    <ActionButton
                        style={{button: {width: '120px'}}}
                        label="Save"
                        onClick={e => this.onProfileSave(e)}
                        brandColor={this.context.brandColor}
                    />
                </div>
            </div>
        );
    }

    renderHeader() {
        return (
            <div style={{display: 'flex', padding: '0 24px'}}>
                <div style={{color: this.context.brandColor, cursor: 'pointer'}} role="button" onClick={e => this.onBack(e)}> &lt; Back </div>
                <div style={{flexGrow: 1, fontWeight: 'bold', display: 'flex', justifyContent: 'center'}}> Account Settings </div>
            </div>
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

    openSettings(e) {
        // no-op
    }

    openSubscribe(e) {
        //no-op
    }

    renderAccountDetail(e) {
        const {name, firstname, email} = this.context.member;
        const siteTitle = this.context.site.title;

        return (
            <div style={{padding: '0 24px'}}>
                <div style={{textAlign: 'center', marginBottom: '12px', fontSize: '14px'}}>
                    <span style={{fontWeight: 'bold'}}>Hey {firstname || name || email}! </span>
                    You are subscribed to free updates from <span style={{fontWeight: 'bold'}}>{siteTitle}</span>, but you don't have a paid subscription to unlock full access
                </div>
                <ActionButton label="Subscribe now" onClick={e => this.openSubscribe(e)} brandColor={this.context.brandColor} />
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
                name: 'name'
            },
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'Email...',
                label: 'Email',
                name: 'email'
            }
        };
        const field = fields[fieldName];
        return (
            <InputField
                label = {field.label}
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e, fieldName) => this.handleInput(e, fieldName)}
            />
        );
    }

    renderProfileData() {
        return (
            <div style={{padding: '0 24px', marginTop: '24px'}}>
                {this.renderInputField('name')}
                {this.renderInputField('email')}
            </div>
        );
    }

    renderNewsletterOption() {
        return (
            <div style={{padding: '0 24px', display: 'flex', alignItems: 'center'}}>
                <div style={{flexGrow: 1}}>
                    <div style={{
                        marginBottom: '3px',
                        fontSize: '12px',
                        fontWeight: '700'
                    }}> Newsletter </div>
                    <div style={{
                        color: '#666666',
                        fontSize: '13px',
                        lineHeight: '6px'
                    }}> You are not subscribed to email newsletters </div>
                </div>
                <div>
                    <Switch onToggle={(e) => {}} />
                </div>
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                {this.renderHeader()}
                {this.renderProfileData()}
                {this.renderNewsletterOption()}
                {this.renderAccountFooter()}
            </div>
        );
    }
}