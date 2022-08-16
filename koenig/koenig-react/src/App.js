import Koenig from './components/Koenig';
import './index.css';

const KoenigEditor = ({...props}) => {
    return (
        <div data-testid="koenig-editor" className="koenig-react">
            <Koenig
                mobiledoc={props.mobiledoc}
                atoms={props.atoms}
                cards={props.cards}
                keyCommands={props.keyCommands}
                didCreateEditor={props.didCreateEditor}
                onChange={props.onChange}
                editorRange={props.editorRange}
                onCursorExitAtTop={props.onCursorExitAtTop}
                uploadUrl={props.uploadUrl}
                accentColor={props.accentColor}
            />
        </div>
    );
};

export default KoenigEditor;
