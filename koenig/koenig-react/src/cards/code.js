import createComponentCard from '../utils/create-component-card';
import Card from '../components/Card';

const EditState = ({payload, save}) => {
    const handleCodeChange = (event) => {
        payload.code = event.target.value;
        save(payload);
    }

    return (
        <>
            <textarea
                autoFocus={true}
                value={payload.code}
                onChange={handleCodeChange}
            />
        </>
    )
};

const DisplayState = ({payload}) => {
    return (
        <>
            <div className="koenig-card-html-rendered">
                <pre><code className="line-numbers">{payload.code}</code></pre>
            </div>
            <div className="koenig-card-click-overlay"></div>
        </>
    );
};

const CodeCardComponent = ({...props}) => {
    const style = props.isEditing ? {backgroundColor: '#f4f8fb', borderColor: '#f4f8fb'} : {};

    return (
        <Card style={style} {...props}>
            {props.isEditing
                ? <EditState payload={props.payload} save={props.env.save} />
                : <DisplayState payload={props.payload} />
            }
        </Card>
    );
};

const CodeCard = createComponentCard({
    name: 'code',
    component: CodeCardComponent,
    koenigOptions: {
        hasEditMode: true
    }
});

export default CodeCard;
