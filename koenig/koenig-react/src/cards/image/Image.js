import React from 'react';
import ImagePlaceholder from './placeholder';
import {Editor, Container} from 'react-mobiledoc-editor';
import KoenigEditor from '../../KoenigEditor';
import {useConstructor} from '../../utils/useConstructor';

const ImageHolder = ({payload, uploadRef, uploadProgress, handleFiles}) => {
    if (payload?.src) {
        return (<img src={payload?.src || ``} alt={payload?.alt || 'image alt description'} />);
    }
    return (
        <ImagePlaceholder 
            uploadRef={uploadRef} 
            progress={uploadProgress} 
            handleFiles={handleFiles} 
        />
    );
};

const CapEditor = ({payload, Alt, env}) => {
    const [instance, setInstance] = React.useState(null);
    const editorRef = React.useRef();

    useConstructor(() => {
        const kgInstance = new KoenigEditor({});
        editorRef.current = kgInstance;
    });

    function _didCreateEditor(mobiledocEditor) {
        setInstance(mobiledocEditor);
        editorRef.current.initMobiledocEditor(mobiledocEditor);
    }

    const handleTextChange = (e) => {
        if (Alt) {
            payload.setPayload({...payload.payload, alt: e.target.value});
        } else {
            let serialized = instance.serializeTo('html');
            payload.setPayload({...payload.payload, caption: serialized});
        }
    };
    return (
        <figcaption className='p-2'>
            <div className="wrapper">
                <div className="caret-inherit cursor-text" >
                    {
                        Alt ?
                            <input
                                className="w-100 text-center font-sans text-sm"
                                type='text'
                                value={payload.payload.alt}
                                onChange={handleTextChange}
                                placeholder="Type alt text for image (optional)"
                            />
                            :
                            <React.Fragment>
                                <Container
                                    className="w-100 text-center font-sans text-sm"
                                    html={payload.payload.caption}
                                    didCreateEditor={_didCreateEditor}
                                    onChange={handleTextChange}
                                    placeholder="Type caption for image (optional)"
                                >
                                    <Editor className="not-kg-prose text-center font-sans text-sm" />
                                </Container>
                            </React.Fragment>
                    }
                </div>
            </div>
        </figcaption>
    );
};

const Image = (props) => {
    const [payload, setPayload] = React.useState({
        src: props?.payload?.src || null,
        alt: props?.payload?.alt || '',
        caption: props?.payload?.caption || ''
    });
    const [uploadProgress, setUploadProgress] = React.useState({
        progress: 0,
        uploading: false
    });
    const [uploadForm, setUploadForm] = React.useState(null);

    const [editAlt, setEditAlt] = React.useState(false);

    const uploadRef = React.useRef(null);

    const handleFiles = (files) => {
        const formData = new FormData();
        formData.append('file', files[0]);
        setUploadForm(formData);
    };

    const onUploadChange = async (e) => {
        handleFiles(e.target.files);
    };

    React.useEffect(() => {
        const handleUpload = async () => {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', props?.uploadUrl);
            setUploadProgress({uploading: true, progress: 0});
            xhr.upload.onprogress = (event) => {
                const percentComplete = (event.loaded / event.total) * 100;
                setUploadProgress({
                    ...uploadProgress,
                    uploading: true,
                    progress: percentComplete
                });
            };
            xhr.onload = () => {
                const response = JSON.parse(xhr.response);
                setPayload({...payload, src: response?.images[0]?.url});
                props.env.save({src: response?.images[0]?.url});
                setUploadProgress({uploading: false, progress: 0});
            };
            xhr.send(uploadForm);
        };
        if (uploadForm) {
            handleUpload();
        }
    }, [uploadForm]);

    React.useEffect(() => {
        const updateEnv = () => {
            props.env.save({alt: payload?.alt, src: payload?.src, caption: payload?.caption});
        };
        updateEnv();
    }, [payload]);
    
    return (
        <figure>
            <div className="__mobiledoc-card">
                <div className='relative'>
                    <ImageHolder payload={payload} uploadRef={uploadRef} uploadProgress={uploadProgress} handleFiles={handleFiles} />
                </div>
                <form onChange={onUploadChange}>
                    <input
                        type='file'
                        accept='image/*'
                        name="image"
                        ref={uploadRef}
                        hidden={true}
                    />
                </form>
                <CapEditor Alt={editAlt} payload={{payload, setPayload}} env={props.env} />
                <button onClick={() => setEditAlt(!editAlt)} className={` absolute bottom-0 right-0 m-3 cursor-pointer rounded border px-1 text-sm font-normal leading-6 ${editAlt ? 'border-green bg-green text-white' : 'border-grey-midlight text-grey-midlight'} `}>Alt</button>            
            </div>
        </figure>
    );
};

export default Image;
