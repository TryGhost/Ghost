import {ParentContext} from '../ParentContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';

const React = require('react');

export default class AccountHomePage extends React.Component {
    static contextType = ParentContext;

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    renderHeader() {
        const memberEmail = this.context.member.email;

        return (
            <>
                <div style={{paddingLeft: '16px', paddingRight: '16px', color: '#A6A6A6', fontSize: '1.2rem', lineHeight: '1.0em'}}>
                    Signed in as
                </div>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingBottom: '9px'}}>
                    {memberEmail}
                </div>
            </>
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

    renderUserHeader() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
                {this.renderUserAvatar()}
                <div style={{fontSize: '21px', fontWeight: '500', marginTop: '6px'}}> Your Account </div>
            </div>
        );
    }

    openSettings(e) {
        // no-op
    }

    renderAccountFooter() {
        return (
            <div style={{display: 'flex', padding: '0 24px', marginTop: '6px', color: this.context.brandColor, fontWeight: 'bold', fontSize: '13px'}}>
                <div style={{cursor: 'pointer'}} role='button'> Contact support </div>
                <div style={{display: 'flex', flexGrow: 1, justifyContent: 'flex-end'}}>
                    <div style={{marginRight: '16px', cursor: 'pointer'}} onClick={e => this.openSettings(e)} role='button'> Settings </div>
                    <div style={{cursor: 'pointer'}} onClick={e => this.handleSignout(e)} role='button'> Logout </div>
                </div>
            </div>
        );
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
                <ActionButton label="Subscribe now" onClick={e => {}} brandColor={this.context.brandColor} />
            </div>
        );
    }

    renderLogoutButton() {
        return (
            <div style={{paddingLeft: '21px', paddingRight: '16px', paddingTop: '12px', borderTop: '1px solid #EFEFEF', cursor: 'pointer'}}>
                <div role="button" onClick={(e) => {
                    this.handleAccountDetail(e);
                }} style={{marginBottom: '3px'}}> Account </div>
                <div role="button" onClick={(e) => {
                    this.handleSignout(e);
                }}> Log out </div>
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                {this.renderUserHeader()}
                {this.renderAccountDetail()}
                {this.renderAccountFooter()}
            </div>
        );
    }
}