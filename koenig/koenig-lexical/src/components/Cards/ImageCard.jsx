import React, {useState, useRef, useEffect, useContext} from 'react';
import {$getNodeByKey} from 'lexical';
import {ReactComponent as ImgPlaceholderIcon} from '../../assets/icons/kg-img-placeholder.svg';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import KoenigComposerContext from '../../context/KoenigComposerContext';
import CardContext from '../../context/CardContext';

function MediaCard({dataset, editor, nodeKey}) {
    const {payload, setPayload} = dataset;
    const {imageUploader} = React.useContext(KoenigComposerContext);

    // const [uploadPercentage, setUploadPercentage] = useState(0);

    const uploadRef = useRef(null);
    const onUploadChange = async (e) => {
        const fls = e.target.files;
        const files = await imageUploader.imageUploader(fls); // idea here is to have something like imageUploader.uploadProgressPercentage to pass to the progress bar.
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSrc(files.src);
            setPayload(node.getPayload());
        });
    };

    useEffect(() => {
        const editorState = editor.getEditorState();
        editorState.read(() => {
            const node = $getNodeByKey(nodeKey);
            setPayload(node.getPayload());
        });
    }, [editor, nodeKey, setPayload]);

    const openUpload = () => {
        uploadRef.current.click();
    };

    if (payload?.__src) {
        return (
            <figure className="kg-card kg-image-card">
                <img src={payload?.__src} alt={payload?.__altText} />
            </figure>
        );
    } else {
        return (
            <>
                <MediaPlaceholder onClick={openUpload} desc="Click to select an image" Icon={ImgPlaceholderIcon} />
                <form onChange={onUploadChange}>
                    <input
                        name="image-input"
                        type='file'
                        accept='image/*'
                        ref={uploadRef}
                        hidden={true}
                    />
                </form>
            </>
        );
    }
}

function ImageCard({nodeKey}) {
    const [altText, setAltText] = useState(false);
    const [editor] = useLexicalComposerContext();
    const [payload, setPayload] = React.useState({});
    const {isSelected, wpkey} = useContext(CardContext);

    React.useEffect(() => {
        const editorState = editor.getEditorState();
        editorState.read(() => {
            const node = $getNodeByKey(nodeKey);
            setPayload(node.getPayload());
        });
    }, [editor, nodeKey]);

    return (
        <div>
            <MediaCard dataset={{payload, setPayload}} editor={editor} nodeKey={nodeKey} />
            <div className="w-full p-2">
                <CaptionEditor selected={isSelected} toggleAltText={{altText, setAltText}} wpkey={wpkey} nodeKey={nodeKey} placeholder={altText ? `Type alt text for image (optional)` : `Type caption for image (optional)`} />
            </div>
        </div>
    );
}

function MediaPlaceholder({desc, Icon, ...props}) {
    return (
        <div className="relative">
            <figure className="cursor-pointer border border-transparent" {...props}>
                <div className="h-100 relative flex items-center justify-center border border-grey-100 bg-grey-50 before:pb-[62.5%]">
                    <button name="placeholder-button" className="group flex flex-col items-center justify-center p-20">
                        <Icon className="h-32 w-32 opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100" />
                        <p className="mt-4 font-sans text-sm font-normal text-grey-700 group-hover:text-grey-800">{desc}</p>
                    </button>
                </div>
            </figure>
        </div>
    );
}

function CaptionEditor({placeholder, nodeKey, toggleAltText, selected}) {
    const [editor] = useLexicalComposerContext();
    const [captionText, setCaptionText] = useState(null);
    const [altTextValue, setAltTextValue] = useState('');
    const {altText, setAltText} = toggleAltText;

    const handleChange = (e) => {
        if (!altText) {
            const cap = e.target.value;
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setCaption(cap);
                setCaptionText(cap);
            });
        } else {
            const alt = e.target.value;
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setAltText(alt);
                setAltTextValue(alt);
            });
        }
    };

    useEffect(() => {
        const editorState = editor.getEditorState();
        editorState.read(() => {
            const node = $getNodeByKey(nodeKey);
            setCaptionText(node.getCaption());
            setAltTextValue(node.getAltText());
        });
    }, [editor, nodeKey]);

    const tgAltText = (e) => {
        e.stopPropagation();
        setAltText(!altText);
    };

    useEffect(() => {
        if (!selected) {
            setAltText(false);
        }
    }, [selected, setAltText]);

    if (selected || captionText) {
        return (
            <>
                <input
                    onChange={handleChange}
                    className="not-kg-prose w-full px-9 text-center font-sans text-sm font-normal leading-8 tracking-wide text-grey-900"
                    placeholder={placeholder}
                    value={(altText ? altTextValue : captionText) || ''}
                />
                <button
                    name="alt-toggle-button"
                    className={`absolute bottom-0 right-0 m-2 cursor-pointer rounded border px-1 font-sans text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${altText ? 'border-green bg-green text-white' : 'border-grey text-grey' } `}
                    onClick={e => tgAltText(e)}>
                                Alt
                </button>
            </>
        );
    }
}

export default ImageCard;

