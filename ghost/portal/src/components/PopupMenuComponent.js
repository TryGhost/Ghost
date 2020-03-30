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
            maxHeight: '100px',
            boxShadow: 'rgba(0, 0, 0, 0.16) 0px 5px 40px',
            opacity: '1',
            height: 'calc(100% - 120px)',
            borderRadius: '8px',
            overflow: 'hidden',
        };

        const launcherStyle = {
            width: '100%',
            height: '100%',
            position: 'absolute',
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
            paddingTop: '15px',
            paddingBottom: '15px',
            textAlign: 'left'
        };
        return (
            <div style={hoverStyle}>
                <div style={launcherStyle}>
                    <div style={buttonStyle}>
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                            <div style={{paddingLeft: '12px',paddingRight: '12px', color: 'grey', fontSize: '12px'}}>
                                SIGNED IN AS
                            </div>
                            <div style={{paddingLeft: '12px',paddingRight: '12px', paddingBottom: '9px'}}>
                                rish@ghost.org
                            </div>
                            <div style={{paddingLeft: '12px',paddingRight: '12px', paddingTop: '12px', borderTop: '1px solid black', cursor: 'pointer'}}>
                                <div> Logout </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}