import createComponentCard from '../utils/create-component-card';
import Card from '../components/Card';
import React from 'react';

const EditState = ({payload, save}) => {
    const [code, setCode] = React.useState(payload.code || '');
    const textareaEl = React.useRef();

    React.useEffect(() => {
        const end = textareaEl.current.value.length;
        textareaEl.current.setSelectionRange(end, end);
        textareaEl.current.focus();
    }, []);

    const handleCodeChange = (event) => {
        setCode(event.target.value); // update inside component with re-render

        payload.code = event.target.value;
        save(payload); // update inside mobiledoc (React won't re-render when this changes)
    };

    return (
        <>
            <textarea
                ref={textareaEl}
                className="h-full w-full bg-transparent p-2 font-mono outline-0"
                value={code}
                onChange={handleCodeChange}
            />
        </>
    );
};

const DisplayState = ({payload}) => {
    return (
        <>
            <div className="leading-[1.8em]">
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
