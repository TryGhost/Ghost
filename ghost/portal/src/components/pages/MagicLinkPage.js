import ActionButton from '../common/ActionButton';
const React = require('react');

export default class MagicLinkPage extends React.Component {
    renderFormHeader() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px'}}>
                <div style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '18px'}}> Check your inbox! </div>
                <div> Check your inbox and click on the login link to complete the signin. </div>
            </div>
        );
    }

    renderLoginMessage() {
        return (
            <div style={{display: 'flex', justifyContent: 'center'}}>
                <div style={{color: '#3db0ef', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => this.props.switchPage('signin')}> Back to Log in </div>
            </div>
        );
    }

    handleClose(e) {
        this.props.onAction('closePopup');
    }

    renderCloseButton() {
        const label = 'Close';
        return (
            <ActionButton
                onClick={e => this.handleSignin(e)}
                brandColor={this.props.brandColor}
                label={label}
            />
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131', padding: '0 24px'}}>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px'}}>
                    {this.renderFormHeader()}
                    {this.renderCloseButton()}
                </div>
            </div>
        );
    }
}
