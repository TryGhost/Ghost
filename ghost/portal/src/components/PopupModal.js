import Frame from './Frame';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
import {hasMode} from '../utils/check-mode';
import AppContext from '../AppContext';
import FrameStyle from './Frame.styles';
import Pages, {getActivePage} from '../pages';

const React = require('react');

const StylesWrapper = ({member}) => {
    return {
        modalContainer: {
            zIndex: '1000',
            position: 'fixed',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
        },
        frame: {
            common: {
                margin: 'auto',
                position: 'relative',
                padding: '0',
                outline: '0',
                width: '100%',
                opacity: '1',
                overflow: 'hidden',
                height: '100%'
            }
        },
        page: {
            links: {
                width: '600px'
            }
        }
    };
};

class PopupContent extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = { };
        this.container = React.createRef();
    }

    renderActivePage() {
        const {page} = this.context;
        getActivePage({page});
        const PageComponent = Pages[page];

        return (
            <PageComponent />
        );
    }

    renderPopupClose() {
        return (
            <div className='gh-portal-closeicon-container'>
                <CloseIcon className='gh-portal-closeicon' onClick = {() => this.context.onAction('closePopup')} />
            </div>
        );
    }

    render() {
        const {page} = this.context;
        getActivePage({page});
        const Styles = StylesWrapper({page});
        const pageStyle = {
            ...Styles.page[page]
        };
        return (
            <div className={hasMode(['preview', 'dev']) ? 'gh-portal-popup-container preview' : 'gh-portal-popup-container'} style={pageStyle} ref={this.container}>
                {this.renderPopupClose()}
                {this.renderActivePage()}
            </div>
        );
    }
}

export default class PopupModal extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            height: null
        };
    }

    renderCurrentPage(page) {
        const PageComponent = Pages[page];

        return (
            <PageComponent />
        );
    }

    onHeightChange(height) {
        this.setState({height});
    }

    renderPopupClose() {
        return (
            <div className='gh-portal-closeicon-container'>
                <CloseIcon className='gh-portal-closeicon' onClick = {() => this.context.onAction('closePopup')} />
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
        const styles = `
            :root {
                --brandcolor: ${this.context.brandColor}
            }
        ` + FrameStyle;
        return (
            <style dangerouslySetInnerHTML={{__html: styles}} />
        );
    }

    renderFrameContainer() {
        const {member} = this.context;
        const Styles = StylesWrapper({member});
        const frameStyle = {
            ...Styles.frame.common
        };
        return (
            <div style={Styles.modalContainer}>
                <Frame style={frameStyle} title="membersjs-popup" head={this.renderFrameStyles()}>
                    <div className={hasMode(['preview', 'dev']) ? 'gh-portal-popup-background preview' : 'gh-portal-popup-background'} onClick = {e => this.handlePopupClose(e)}></div>
                    <PopupContent />
                </Frame>
            </div>
        );
    }

    render() {
        const {showPopup} = this.context;
        if (showPopup) {
            return this.renderFrameContainer();
        }
        return null;
    }
}
