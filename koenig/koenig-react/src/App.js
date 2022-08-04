import Koenig from './components/Koenig';
import './index.css';

const KoenigEditor = ({...props}) => {
    return (
        <div className="koenig-react">
            <Koenig
                mobiledoc={props.mobiledoc}
                atoms={props.atoms}
                keyCommands={props.keyCommands}
                didCreateEditor={props.didCreateEditor}
                onChange={props.onChange}
                editorRange={props.editorRange}
            />
        </div>
    );
};

export default KoenigEditor;
