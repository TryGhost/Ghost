/**
 * Low-level iframe wrapper that renders children into the iframe body via a
 * React portal. Kept as a class component deliberately — converting to a
 * functional component causes DOM recreation on every render, producing layout
 * glitches and height-jumping in the resizable variant.
 */
import {Component, ReactNode} from 'react';
import {createPortal} from 'react-dom';

interface IFrameProps {
    children: ReactNode;
    head?: ReactNode;
    style?: React.CSSProperties;
    title?: string;
    onResize?: (el: HTMLElement) => void;
}

interface IFrameState {
    iframeHead: HTMLHeadElement | null;
    iframeRoot: HTMLElement | null;
}

export class IFrame extends Component<IFrameProps, IFrameState> {
    private node: HTMLIFrameElement | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(props: IFrameProps) {
        super(props);
        this.state = {iframeHead: null, iframeRoot: null};
        this.setNode = this.setNode.bind(this);
        this.handleLoad = this.handleLoad.bind(this);
    }

    override componentDidMount(): void {
        this.node?.addEventListener('load', this.handleLoad);
    }

    override componentWillUnmount(): void {
        this.node?.removeEventListener('load', this.handleLoad);
        this.resizeObserver?.disconnect();
    }

    private handleLoad(): void {
        const doc = this.node?.contentDocument;
        if (!doc) {
            return;
        }

        this.setState({
            iframeHead: doc.head,
            iframeRoot: doc.body
        });

        if (this.props.onResize) {
            const {onResize} = this.props;
            this.resizeObserver = new ResizeObserver(() => {
                if (doc.body) onResize(doc.body);
            });
            this.resizeObserver.observe(doc.body);
        }

        // Bubble keydown events from inside the iframe to the parent window so
        // keyboard navigation and shortcuts work as expected regardless of which
        // frame has focus.
        this.node?.contentWindow?.addEventListener('keydown', (e: KeyboardEvent) => {
            window.dispatchEvent(new KeyboardEvent('keydown', e));
        });
    }

    private setNode(node: HTMLIFrameElement | null): void {
        this.node = node;
    }

    override render(): ReactNode {
        const {children, head, title = '', style = {}} = this.props;
        const {iframeHead, iframeRoot} = this.state;

        return (
            <iframe
                frameBorder="0"
                ref={this.setNode}
                srcDoc="<!DOCTYPE html>"
                style={style}
                title={title}
            >
                {iframeHead && head ? createPortal(head, iframeHead) : null}
                {iframeRoot ? createPortal(children, iframeRoot) : null}
            </iframe>
        );
    }
}
