import {useRef} from 'react';
import Frame, {useFrame} from 'react-frame-component';
import Koenig from './components/Koenig';
import useResizeObserver from './effects/use-resize-observer';
import styles from './index.css';
import './frame-styles.css';

const intialContent = `<!DOCTYPE html><html><style>${styles}</style><head></head><body><div></div></body></html>`;

const EditorResizeObserver = ({children, ...props}) => {
    const {document} = useFrame();

    useResizeObserver({callback: props.onResize, element: document.body});

    return (<>{children}</>);
};

const KoenigEditor = ({...props}) => {
    const iframeRef = useRef(null);

    const handleResize = (resizeList) => {
        const [{contentRect}] = resizeList;
        iframeRef.current.style.height = `${contentRect.height}px`;
    };

    return (
        <Frame
            initialContent={intialContent}
            className="koenig-react-frame"
            ref={iframeRef}
        >
            <EditorResizeObserver onResize={handleResize}>
                <Koenig
                    mobiledoc={props.mobiledoc}
                    atoms={props.atoms}
                    keyCommands={props.keyCommands}
                    didCreateEditor={props.didCreateEditor}
                    onChange={props.onChange}
                />
            </EditorResizeObserver>
        </Frame>
    );
};

export default KoenigEditor;
