import {Component, ReactNode} from 'react';
import {createPortal} from 'react-dom';

interface FrameProps {
    children: ReactNode;
    head: ReactNode;
    title?: string;
    style?: React.CSSProperties;
    searchdir: 'ltr' | 'rtl';
}

export default class Frame extends Component<FrameProps> {
    node: HTMLIFrameElement | null = null;
    iframeHtml: HTMLElement | null = null;
    iframeHead: HTMLHeadElement | null = null;
    iframeRoot: HTMLElement | null = null;

    componentDidMount() {
        this.node?.addEventListener('load', this.handleLoad);
    }

    componentWillUnmount() {
        this.node?.removeEventListener('load', this.handleLoad);
    }

    handleLoad = () => {
        this.setupFrameBaseStyle();
    };

    setupFrameBaseStyle() {
        if (this.node?.contentDocument) {
            this.iframeHtml = this.node.contentDocument.documentElement;
            this.iframeHtml.setAttribute('dir', this.props.searchdir);
            this.iframeHead = this.node.contentDocument.head;
            this.iframeRoot = this.node.contentDocument.body;
            this.forceUpdate();
        }
    }

    render() {
        const {children, head, title = '', style = {}} = this.props;
        return (
            <iframe
                srcDoc="<!DOCTYPE html>"
                ref={node => (this.node = node)}
                title={title}
                style={style}
                frameBorder="0"
            >
                {this.iframeHead && createPortal(head, this.iframeHead)}
                {this.iframeRoot && createPortal(children, this.iframeRoot)}
            </iframe>
        );
    }
}
