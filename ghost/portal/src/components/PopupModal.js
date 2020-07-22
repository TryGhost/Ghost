import Frame from './Frame';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
import AppContext from '../AppContext';
import FrameStyle from './Frame.styles';
import Pages, {getActivePage} from '../pages';

const React = require('react');

const StylesWrapper = ({member}) => {
    const isPaidMember = (member && member.paid);
    const accountHome = isPaidMember ? {
        width: '428px',
        minHeight: '650px',
        maxHeight: '700px'
    } : {
        width: '428px',
        minHeight: '330px',
        maxHeight: '330px'
    };
    const accountProfile = isPaidMember ? {
        width: '428px',
        minHeight: '320px',
        maxHeight: '320px'
    } : {
        width: '428px',
        minHeight: '380px',
        maxHeight: '380px'
    };
    return {
        modalContainer: {
            zIndex: '1000',
            paddingTop: '100px',
            position: 'fixed',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            overflow: 'auto',
            textAlign: 'center',
            backgroundColor: 'rgba(0,0,0,0.65)'
        },
        frame: {
            common: {
                margin: 'auto',
                position: 'relative',
                padding: '0',
                outline: '0',
                width: '428px',
                borderRadius: '5px',
                boxShadow: '0 2.8px 2.2px rgba(0, 0, 0, 0.034), 0 6.7px 5.3px rgba(0, 0, 0, 0.048), 0 12.5px 10px rgba(0, 0, 0, 0.06), 0 22.3px 17.9px rgba(0, 0, 0, 0.072), 0 41.8px 33.4px rgba(0, 0, 0, 0.086), 0 100px 80px rgba(0, 0, 0, 0.12)',
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
            accountHome,
            magiclink: {
                minHeight: '230px',
                maxHeight: '230px'
            },
            loading: {
                minHeight: '130px'
            },
            accountPlan: {
                width: '428px',
                minHeight: '290px',
                maxHeight: '290px'
            },
            accountProfile,
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
        this.height = null;
    }

    updateHeight(height) {
        this.props.updateHeight && this.props.updateHeight(height);
    }

    componentDidMount() {
        this.height = this.container.current && this.container.current.offsetHeight;
        this.updateHeight(this.height);
    }

    componentDidUpdate() {
        const height = this.container.current && this.container.current.offsetHeight;
        if (height !== this.height) {
            this.height = height;
            this.updateHeight(this.height);
        }
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
        return (
            <div className='gh-portal-popup-container' ref={this.container}>
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
        const page = getActivePage({page: this.context.page});
        const frameStyle = {
            ...Styles.frame.common,
            ...Styles.frame[page]
        };
        if (this.state.height) {
            const updatedHeight = this.state.height;
            frameStyle.minHeight = `${updatedHeight}px`;
            frameStyle.maxHeight = `${updatedHeight}px`;
        }
        return (
            <div style={Styles.modalContainer} onClick = {e => this.handlePopupClose(e)}>
                <Frame style={frameStyle} title="membersjs-popup" head={this.renderFrameStyles()}>
                    <PopupContent updateHeight={height => this.onHeightChange(height)}/>
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
