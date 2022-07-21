import Frame from '../Frame';

export default function Modal(props) {
    return (
        <Frame type="fixed" style={props.style}>
            {props.children}
        </Frame>
    );
}

/*
export default class Modal extends Component {
    constructor(props) {
        super(props);
        this.el = document.createElement('div');
    }
  
    componentDidMount() {
        // The portal element is inserted in the DOM tree after
        // the Modal's children are mounted, meaning that children
        // will be mounted on a detached DOM node. If a child
        // component requires to be attached to the DOM tree
        // immediately when mounted, for example to measure a
        // DOM node, or uses 'autoFocus' in a descendant, add
        // state to Modal and only render the children when Modal
        // is inserted in the DOM tree.
        const modalRoot = document.getElementById('ghost-comments-modal-root');
        modalRoot.appendChild(this.el);
    }
  
    componentWillUnmount() {
        const modalRoot = document.getElementById('ghost-comments-modal-root');
        modalRoot.removeChild(this.el);
    }
  
    render() {
        const content = (
            <Frame type="fixed" style={this.props.style}>
                {this.props.children}
            </Frame>
        );
        return createPortal(
            content,
            this.el
        );
    }
}
*/
