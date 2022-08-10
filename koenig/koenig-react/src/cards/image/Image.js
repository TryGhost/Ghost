import React from 'react';
import ImagePlaceholder from './placeholder';

const Editor = ({payload, Alt, env}) => {
    const handleTextChange = (e) => {
        payload.setPayload({...payload.payload, alt: e.target.value});
        env.save({alt: e.target.value, src: payload.payload.src});
    };

    return (
        <figcaption>
            <div className="wrapper">
                <div className="caret-inherit cursor-text text-sm" >
                    {
                        Alt ? 
                            <input
                                className="w-100"
                                type='text'
                                value={payload.payload.alt}
                                onChange={handleTextChange}
                            />
                            :
                            <p>should be mobiledoc editor here</p>
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
        caption: props?.payload?.caption || 'image caption'
    });
    const [uploadProgress, setUploadProgress] = React.useState({
        progress: 0,
        uploading: false
    });
    const [uploadForm, setUploadForm] = React.useState(null);

    const [editAlt, setEditAlt] = React.useState(true);
    const uploadRef = React.useRef(null);
    const onUploadChange = async (e) => {
        const formData = new FormData();
        formData.append('file', e.target.files[0]);
        setUploadForm(formData);
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
    
    return (
        <div>
            <div className="__mobiledoc-card">
                <div className='relative'>
                    {
                        payload.src ?
                            <img src={payload?.src || ``} alt={payload?.alt || 'image alt description'} />
                            :
                            <ImagePlaceholder uploadRef={uploadRef} progress={uploadProgress} />
                    }
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
                <Editor Alt={editAlt} payload={{payload, setPayload}} env={props.env} />
                <button onClick={() => setEditAlt(!editAlt)} className={` absolute bottom-0 right-0 cursor-pointer rounded-lg text-sm shadow-[0_0_0_1px] ${editAlt ? 'bg-green-500' : 'shadow-gray-500'} `}>Alt</button>
            </div>
        </div>
    );
};

export default Image;
