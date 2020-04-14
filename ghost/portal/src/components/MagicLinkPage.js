const React = require('react');

export default class MagicLinkPage extends React.Component {
    renderFormHeader() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
                <div style={{fontSize: '18px', fontWeight: 'bold'}}> Check your Inbox! </div>
                <div> We just sent you a login link, check your Inbox! </div>
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

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px'}}>
                    {this.renderFormHeader()}
                    {this.renderLoginMessage()}
                </div>
            </div>
        );
    }
}
