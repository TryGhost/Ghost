import Frame from './Frame';
import SigninPage from './pages/SigninPage';
import SignupPage from './pages/SignupPage';
import AccountHomePage from './pages/AccountHomePage';
import MagicLinkPage from './pages/MagicLinkPage';
import LoadingPage from './pages/LoadingPage';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
import {ParentContext} from './ParentContext';
import FrameStyle from './Frame.styles';
import AccountPlanPage from './pages/AccountPlanPage';
import PaidAccountHomePage from './pages/PaidAccountHomePage';
import AccountProfilePage from './pages/AccountProfilePage';

const React = require('react');

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
            width: '500px',
            minHeight: '300px',
            maxHeight: '350px'
        },
        paidAccountHome: {
            width: '500px',
            minHeight: '650px',
            maxHeight: '700px'
        },
        magiclink: {
            minHeight: '230px',
            maxHeight: '230px'
        },
        loading: {
            minHeight: '130px'
        },
        accountPlan: {
            width: '500px',
            minHeight: '290px',
            maxHeight: '290px'
        },
        accountProfile: {
            width: '500px',
            minHeight: '400px',
            maxHeight: '400px'
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
    paidAccountHome: PaidAccountHomePage,
    accountPlan: AccountPlanPage,
    accountProfile: AccountProfilePage,
    magiclink: MagicLinkPage,
    loading: LoadingPage
};

export default class PopupModal extends React.Component {
    static contextType = ParentContext;

    renderCurrentPage(page) {
        const PageComponent = Pages[page];

        return (
            <PageComponent />
        );
    }

    renderPopupClose() {
        return (
            <div style={{display: 'flex', justifyContent: 'flex-end', padding: '0 20px'}}>
                <CloseIcon style={Styles.popup.closeIcon} onClick = {() => this.context.onAction('closePopup')} />
            </div>
        );
    }

    renderPopupContent() {
        return (
            <div style={Styles.popup.container}>
                {this.renderPopupClose()}
                {this.renderCurrentPage(this.context.page)}
            </div>
        );
    }

    handlePopupClose(e) {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            this.context.onAction('closePopup');
        }
    }

    renderFrameStyles() {
        return (
            <style dangerouslySetInnerHTML={{__html: FrameStyle}} />
        );
    }

    renderFrameContainer() {
        const page = this.context.page;
        const frameStyle = {
            ...Styles.frame.common,
            ...Styles.frame[page]
        };
        return (
            <div style={Styles.modalContainer} onClick = {e => this.handlePopupClose(e)}>
                <Frame style={frameStyle} title="membersjs-popup" head={this.renderFrameStyles()}>
                    {this.renderPopupContent()}
                </Frame>
            </div>
        );
    }

    render() {
        return this.renderFrameContainer();
    }
}
