import FrameComponent from './FrameComponent';
const React = require("react");
const PropTypes = require("prop-types");

export default class PopupMenuComponent extends React.Component {
    static propTypes = {
        name: PropTypes.string,
    };

    constructor(props) {
        super(props);
        this.state = {
            inputVal: '',
            isLoading: false,
            showSuccess: false
        }
    }

    handleSignout(e) {
        e.preventDefault();
        this.props.onSignout();
    }

    handleSignin(e) {
        e.preventDefault();
        const email = this.state.inputVal;
        this.props.onSignin({email});
        this.setState({
            isLoading: true,
            showSuccess: false
        });
        setTimeout(() => {
            this.setState({
                isLoading: false,
                showSuccess: true
            })
        }, 3000)
    }

    handleInput(e) {
        this.setState({
            inputVal: e.target.value,
            showSuccess: false,
            isLoading: false
        })
    }

    isMemberLoggedIn() {
        return !!this.props.data.member;
    }

    getMemberEmail() {
        if (this.isMemberLoggedIn()) {
            return this.props.data.member.email;
        }

        return '';
    }

    renderSignedOutContent() {
        const inputStyle = {
            display: 'block',
            padding: '0 .6em',
            width: '100%',
            height: '44px',
            outline: '0',
            border: '1px solid #c5d2d9',
            color: 'inherit',
            textDecoration: 'none',
            background: '#fff',
            borderRadius: '5px',
            fontSize: '14px',
            marginBottom: '12px'
        };

        const blogTitle = (this.props.data.site && this.props.data.site.title) || 'Site Title';
        const blogDescription = (this.props.data.site && this.props.data.site.description) || 'Site Description';
        return (
            <div style={{ display: 'flex', flexDirection: 'column', color: '#313131' }}>
                <div style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{fontSize: '18px', fontWeight: 'bold'}}> Signup/Signin to {blogTitle}</div>
                        <div>{blogDescription} </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
                        <input
                            type="email"
                            placeholder="Type your email..."
                            value={this.state.inputVal}
                            onChange={(e) => { this.handleInput(e) }}
                            style={inputStyle}
                        />
                        {this.renderSubmitButton()}
                        {this.renderSuccessMessage()}
                    </div>

                </div>
            </div>
        );
    }

    renderSuccessMessage() {
        if (!this.state.isLoading && this.state.showSuccess) {
            return (
                <div> Please check your email for magic link! </div>
            )
        }
        return null;
    }

    renderSubmitButton() {
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
            backgroundColor: '#3eb0ef',
            boxShadow: 'none',
            userSelect: 'none'
        }
        const label = this.state.isLoading ? 'Sending' : 'Continue';
        const disabled = this.state.isLoading ? true : false;
        return (
            <button onClick={(e) => { this.handleSignin(e) }} style={buttonStyle} disabled={disabled}>
                {label}
            </button>
        )
    }

    renderSignedinContent() {
        const memberEmail = (this.props.data.member && this.props.data.member.email) || "test@test.com";

        return (
            <div style={{ display: 'flex', flexDirection: 'column', color: '#313131' }}>
                <div style={{ paddingLeft: '16px', paddingRight: '16px', color: '#A6A6A6', fontSize: '1.2rem', lineHeight: '1.0em' }}>
                    Signed in as
                </div>
                <div style={{ paddingLeft: '16px', paddingRight: '16px', paddingBottom: '9px' }}>
                    {memberEmail}
                </div>
                <div style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', borderTop: '1px solid #EFEFEF', cursor: 'pointer' }}>
                    <div onClick={(e) => { this.handleSignout(e) }}> Logout </div>
                </div>
            </div>
        );
    }

    renderPopupContent() {

        const launcherStyle = {
            width: '100%',
            height: '100%',
            position: 'absolute',
            letterSpacing: '0',
            textRendering: 'optimizeLegibility',
            fontSize: '1.5rem'
        };

        const buttonStyle = {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            position: 'absolute',
            top: '0px',
            bottom: '0px',
            left: '0px',
            right: '0px',
            overflow: 'hidden',
            paddingTop: '18px',
            paddingBottom: '18px',
            textAlign: 'left'
        };

        return (
            <div style={launcherStyle}>
                <div style={buttonStyle}>
                    {this.isMemberLoggedIn() ? this.renderSignedinContent() : this.renderSignedOutContent()}
                </div>
            </div>
        );
    }

    render() {
        let hoverStyle = {
            zIndex: '2147483000',
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            width: '250px',
            minHeight: '50px',
            maxHeight: '116px',
            boxShadow: 'rgba(0, 0, 0, 0.16) 0px 5px 40px',
            opacity: '1',
            height: 'calc(100% - 120px)',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'white'
        };

        if (!this.isMemberLoggedIn()) {
            hoverStyle = {
                ...hoverStyle,
                width: '450px',
                minHeight: '200px',
                maxHeight: '220px',
            }
        }

        return (
            <FrameComponent style={hoverStyle}>
                {this.renderPopupContent()}
            </FrameComponent>
        );
    }
}