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
        const buttonStyle = {
            display: 'inline-block',
            padding: '0 1.8rem',
            height: '44px',
            border: '0',
            fontSize: '1.5rem',
            lineHeight: '42px',
            fontWeight: '600',
            textAlign: 'center',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: '.4s ease',
            color: '#fff',
            backgroundColor: this.props.brandColor || '#3eb0ef',
            boxShadow: 'none',
            userSelect: 'none',
            width: '100%',
            marginBottom: '12px'
        };
        return (
            <button onClick={(e) => {
                this.handleClose(e);
            }} style={buttonStyle}>
                Close
            </button>
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
