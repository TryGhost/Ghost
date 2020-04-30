import ActionButton from '../common/ActionButton';
import {ParentContext} from '../ParentContext';
const React = require('react');

export default class MagicLinkPage extends React.Component {
    static contextType = ParentContext;

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
                <div style={{color: '#3db0ef', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => this.context.onAction('switchPage', 'signin')}> Back to Log in </div>
            </div>
        );
    }

    handleClose(e) {
        this.context.onAction('closePopup');
    }

    renderCloseButton() {
        const label = 'Close';
        return (
            <ActionButton
                onClick={e => this.handleClose(e)}
                brandColor={this.context.brandColor}
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
