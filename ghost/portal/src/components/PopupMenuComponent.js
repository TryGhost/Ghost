import FrameComponent from './FrameComponent';
const React = require("react");
const PropTypes = require("prop-types");

export default class PopupMenuComponent extends React.Component {
    static propTypes = {
        name: PropTypes.string,
    };

    render() {
        const hoverStyle = {
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
        const memberEmail = (this.props.data && this.props.data.email) || "test@test.com";
        return (
            <FrameComponent style={hoverStyle}>
                <div style={launcherStyle}>
                    <div style={buttonStyle}>
                        <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                            <div style={{paddingLeft: '16px', paddingRight: '16px', color: '#A6A6A6', fontSize: '1.2rem', lineHeight: '1.0em'}}>
                                Signed in as
                            </div>
                            <div style={{paddingLeft: '16px', paddingRight: '16px', paddingBottom: '9px'}}>
                                {memberEmail}
                            </div>
                            <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', borderTop: '1px solid #EFEFEF', cursor: 'pointer'}}>
                                <div data-members-signout> Logout </div>
                            </div>
                        </div>
                    </div>
                </div>
            </FrameComponent>
        );
    }
}