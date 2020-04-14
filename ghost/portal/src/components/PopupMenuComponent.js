import FrameComponent from './FrameComponent';
import SignupPage from './SignupPage';
import SigninPage from './SigninPage';
import SignedInPage from './SignedInPage';
import MagicLinkPage from './MagicLinkPage';
const React = require('react');
const PropTypes = require('prop-types');

const Styles = {
    frame: {
        common: {
            zIndex: '2147483000',
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            width: '350px',
            minHeight: '350px',
            maxHeight: '410px',
            boxShadow: 'rgba(0, 0, 0, 0.16) 0px 5px 40px',
            opacity: '1',
            height: 'calc(100% - 120px)',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'white'
        },
        signin: {
            width: '400px',
            minHeight: '200px',
            maxHeight: '240px'
        },
        signup: {
            width: '450px',
            minHeight: '400px',
            maxHeight: '460px'
        },
        signedin: {
            width: '380px',
            minHeight: '350px',
            maxHeight: '410px'
        },
        magiclink: {
            width: '400px',
            minHeight: '130px',
            maxHeight: '130px'
        }
    },
    popup: {
        parent: {
            width: '100%',
            height: '100%',
            position: 'absolute',
            letterSpacing: '0',
            textRendering: 'optimizeLegibility',
            fontSize: '1.5rem'
        },
        container: {
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
        }
    }
};

const Pages = {
    signin: SigninPage,
    signup: SignupPage,
    signedin: SignedInPage,
    magiclink: MagicLinkPage
};

export default class PopupMenuComponent extends React.Component {
    static propTypes = {
        data: PropTypes.shape({
            site: PropTypes.shape({
                title: PropTypes.string,
                description: PropTypes.string
            }).isRequired,
            member: PropTypes.shape({
                email: PropTypes.string
            })
        }).isRequired,
        action: PropTypes.object,
        page: PropTypes.string.isRequired,
        onAction: PropTypes.func.isRequired
    };

    renderCurrentPage(page) {
        const PageComponent = Pages[page];
        return (
            <PageComponent
                data={this.props.data}
                action={this.props.action}
                onAction={(action, data) => this.props.onAction(action, data)}
                switchPage={page => this.props.switchPage(page)}
            />
        );
    }

    renderPopupContent() {
        return (
            <div style={Styles.popup.parent}>
                <div style={Styles.popup.container}>
                    {this.renderCurrentPage(this.props.page)}
                </div>
            </div>
        );
    }

    renderFrameContainer() {
        const page = this.props.page;
        const frameStyle = {
            ...Styles.frame.common,
            ...Styles.frame[page]
        };

        return (
            <FrameComponent style={frameStyle}>
                {this.renderPopupContent()}
            </FrameComponent>
        );
    }

    render() {
        return this.renderFrameContainer();
    }
}
