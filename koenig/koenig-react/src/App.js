import Frame from 'react-frame-component';
import Koenig from './components/Koenig';
import styles from './index.css';
import './frame-styles.css';

const intialContent = `<!DOCTYPE html><html><style>${styles}</style><head></head><body><div></div></body></html>`;

const KoenigEditor = ({...props}) => {
    return (
        <Frame
            initialContent={intialContent}
            className="koenig-react-frame"
        >
            <Koenig
                mobiledoc={props.mobiledoc}
                atoms={props.atoms}
                keyCommands={props.keyCommands}
                didCreateEditor={props.didCreateEditor}
                onChange={props.onChange}
            />
        </Frame>
    );
};

export default KoenigEditor;
