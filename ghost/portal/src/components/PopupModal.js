import Frame from './Frame';
import SigninPage from './pages/SigninPage';
import SignupPage from './pages/SignupPage';
import AccountHomePage from './pages/AccountHomePage';
import MagicLinkPage from './pages/MagicLinkPage';
import LoadingPage from './pages/LoadingPage';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';

const React = require('react');
const PropTypes = require('prop-types');

const Styles = {
    modalContainer: {
        zIndex: '1000',
        paddingTop: '100px',
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        backgroundColor: 'rgba(128,128,128,0.5)'
    },
    frame: {
        common: {
            margin: 'auto',
            position: 'relative',
            padding: '0',
            outline: '0',
            width: '500px',
            borderRadius: '8px',
            boxShadow: 'rgba(0, 0, 0, 0.16) 0px 5px 40px',
            opacity: '1',
            overflow: 'hidden',
            height: '60%',
            backgroundColor: 'white'
        },
        signin: {
            minHeight: '200px',
            maxHeight: '330px'
        },
        signup: {
            minHeight: '580px',
            maxHeight: '620px'
        },
        accountHome: {
            minHeight: '350px',
            maxHeight: '510px'
        },
        magiclink: {
            minHeight: '230px',
            maxHeight: '230px'
        },
        loading: {
            minHeight: '130px'
        }
    },
    popup: {
        container: {
            width: '100%',
            height: '100%',
            position: 'absolute',
            letterSpacing: '0',
            textRendering: 'optimizeLegibility',
            fontSize: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            top: '0px',
            bottom: '0px',
            left: '0px',
            right: '0px',
            overflow: 'hidden',
            paddingTop: '18px',
            paddingBottom: '18px',
            textAlign: 'left',
            boxSizing: 'border-box'
        },
        closeIcon: {
            width: '16px',
            height: '16px',
            color: 'grey',
            cursor: 'pointer'
        }
    }
};

const Pages = {
    signin: SigninPage,
    signup: SignupPage,
    accountHome: AccountHomePage,
    magiclink: MagicLinkPage,
    loading: LoadingPage
};

export default class PopupModal extends React.Component {
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
                brandColor={this.props.brandColor}
                switchPage={page => this.props.switchPage(page)}
            />
        );
    }

    renderPopupClose() {
        return (
            <div style={{display: 'flex', justifyContent: 'flex-end', padding: '0 20px'}}>
                <CloseIcon style={Styles.popup.closeIcon} onClick = {() => this.props.onToggle()} />
            </div>
        );
    }

    renderPopupContent() {
        return (
            <div style={Styles.popup.container}>
                {this.renderPopupClose()}
                {this.renderCurrentPage(this.props.page)}
            </div>
        );
    }

    handlePopupClose(e) {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            this.props.onToggle();
        }
    }

    renderFrameContainer() {
        const page = this.props.page;
        const frameStyle = {
            ...Styles.frame.common,
            ...Styles.frame[page]
        };
        return (
            <div style={Styles.modalContainer} onClick = {e => this.handlePopupClose(e)}>
                <Frame style={frameStyle} title="membersjs-popup">
                    {this.renderPopupContent()}
                </Frame>
            </div>
        );
    }

    render() {
        return this.renderFrameContainer();
    }
}
