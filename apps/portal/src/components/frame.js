import {Component} from 'react';
import {createPortal} from 'react-dom';

export default class Frame extends Component {
    componentDidMount() {
        this.node.addEventListener('load', this.handleLoad);
    }

    handleLoad = () => {
        this.setupFrameBaseStyle();
    };

    componentWillUnmout() {
        this.node.removeEventListener('load', this.handleLoad);
    }

    setupFrameBaseStyle() {
        if (this.node.contentDocument) {
            this.iframeHtml = this.node.contentDocument.documentElement;
            this.iframeHead = this.node.contentDocument.head;
            this.iframeRoot = this.node.contentDocument.body;
            this.iframeHtml.setAttribute('dir', this.props.dataDir);
            this.forceUpdate();
        }
    }

    render() {
        const {children, head, title = '', style = {}, dataTestId = '', dataDir = 'ltr', ...rest} = this.props;
        return (
            <iframe
                srcDoc={`<!DOCTYPE html>`}
                data-testid={dataTestId}
                ref={node => (this.node = node)}
                title={title}
                style={style} frameBorder="0"
                dir={dataDir}
                {...rest}
            >
                {this.iframeHead && createPortal(head, this.iframeHead)}
                {this.iframeRoot && createPortal(children, this.iframeRoot)}
            </iframe>
        );
    }
}
