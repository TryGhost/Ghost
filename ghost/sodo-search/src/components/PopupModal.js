import Frame from './Frame';
import AppContext from '../AppContext';
import {getFrameStyles} from './Frame.styles';
import {ReactComponent as SearchIcon} from '../icons/search.svg';
import {ReactComponent as ClearIcon} from '../icons/delete.svg';

const React = require('react');

const StylesWrapper = () => {
    return {
        modalContainer: {
            zIndex: '3999999',
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

    componentDidMount() {
        // Handle Esc to close popup
        if (this.node) {
            this.node.focus();
            this.keyUphandler = (event) => {
                const eventTargetTag = (event.target && event.target.tagName);
                if (event.key === 'Escape' && eventTargetTag !== 'INPUT') {
                    // this.context.onAction('closePopup');
                }
            };
            this.node.ownerDocument.removeEventListener('keyup', this.keyUphandler);
            this.node.ownerDocument.addEventListener('keyup', this.keyUphandler);
        }
        this.sendContainerHeightChangeEvent();
    }

    sendContainerHeightChangeEvent() {

    }

    componentDidUpdate() {
        this.sendContainerHeightChangeEvent();
    }

    componentWillUnmount() {
        if (this.node) {
            this.node.ownerDocument.removeEventListener('keyup', this.keyUphandler);
        }
    }

    handlePopupClose(e) {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            this.context.onAction('closePopup');
        }
    }

    render() {
        return (
            <Search />
        );
    }
}

function Search() {
    let pageClass = 'search';

    let className = 'gh-portal-popup-container';

    const containerClassName = `${className} ${pageClass}`;

    return (
        <>
            <div className={'gh-portal-popup-wrapper'}>
                <div className={containerClassName} style={{}}>
                    <div>
                        <SearchIcon alt='Search' />
                        Search posts, tags, and authors
                        <ClearIcon alt='Clear' />
                    </div>
                </div>
            </div>
        </>
    );
}

export default class PopupModal extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            height: null
        };
    }

    onHeightChange(height) {
        this.setState({height});
    }

    handlePopupClose(e) {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            // this.context.onAction('closePopup');
        }
    }

    renderFrameStyles() {
        const FrameStyle = getFrameStyles({});
        const styles = `
            :root {
                --brandcolor: ${this.context.brandColor || ''}
            }
        ` + FrameStyle;

        return (
            <>
                <link rel="stylesheet" href="http://localhost:3000/main.css" />
                <style dangerouslySetInnerHTML={{__html: styles}} />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </>
        );
    }

    renderFrameContainer() {
        const Styles = StylesWrapper();

        const frameStyle = {
            ...Styles.frame.common
        };

        let className = 'gh-portal-popup-background';

        return (
            <div style={Styles.modalContainer}>
                <Frame style={frameStyle} title="portal-popup" head={this.renderFrameStyles()}>
                    <div className={className} onClick = {e => this.handlePopupClose(e)}></div>
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
