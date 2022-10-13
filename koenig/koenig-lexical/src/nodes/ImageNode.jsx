import React, {useState, useRef, useEffect} from 'react';
import {DecoratorNode, $getNodeByKey} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ReactComponent as ImgPlaceholderIcon} from '../assets/icons/kg-img-placeholder.svg';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {imageUploader} from '../components/KoenigEditor';
import {ReactComponent as ImageCardIcon} from '../assets/icons/kg-card-type-image.svg';

function MediaCard({dataset, editor, nodeKey}) {
    const {payload, setPayload} = dataset;
    const uploadRef = useRef(null);
    const onUploadChange = async (e) => {
        const fls = e.target.files;
        const files = await imageUploader(fls);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSrc(files.src);
            setPayload(node.getPayload());
        });
    };

    const openUpload = () => {
        uploadRef.current.click();
    };

    if (payload?.__src) {
        return (
            <figure className="kg-card kg-image-card">
                <img src={payload?.__src} alt={payload?.__altText} />
                <figcaption className="kg-image-card-caption"></figcaption>
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

    React.useEffect(() => {
        const editorState = editor.getEditorState();
        editorState.read(() => {
            const node = $getNodeByKey(nodeKey);
            setPayload(node.getPayload());
        });
    }, [editor, nodeKey]);

    const toggleAltText = (e) => {
        e.stopPropagation();
        setAltText(!altText);
    };

    return (
        <div>
            <MediaCard dataset={{payload, setPayload}} editor={editor} nodeKey={nodeKey} />
            <CaptionEditor altText={altText} nodeKey={nodeKey} placeholder={altText ? `Type Alt Text for image (optional)` : `Type caption for image (optional)`} />
            <button
                name="alt-toggle-button"
                className={`absolute bottom-0 right-0 m-3 cursor-pointer rounded border px-1 text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${altText ? 'border-green bg-green text-white' : 'border-grey text-grey' } `}
                onClick={e => toggleAltText(e)}>
                        Alt
            </button>
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
                        <p className="mt-4 text-sm font-normal text-grey-700 group-hover:text-grey-800">{desc}</p>
                    </button>
                </div>
            </figure>
        </div>
    );
}

function CaptionEditor({placeholder, nodeKey, altText}) {
    const [editor] = useLexicalComposerContext();
    const [captionText, setCaptionText] = useState('');
    const [altTextValue, setAltTextValue] = useState('');

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

    return (
        <input
            onChange={handleChange}
            className="not-kg-prose w-full p-2 text-center font-sans text-sm font-normal tracking-wide text-grey-900"
            placeholder={placeholder}
            value={altText ? altTextValue : captionText}
        />
    );
}

function convertImageElement(domNode) {
    if (domNode instanceof HTMLImageElement) {
        const {altText, src} = domNode;
        const node = $createImageNode({altText, src});
        return {node};
    }
    return null;
}

export class ImageNode extends DecoratorNode {
    static getType() {
        return 'image';
    }
    static clone(node) {
        return new ImageNode(
            node.__src,
            node.__caption,
            node.__altText,
            node.__key,
        );
    }

    static importJSON(serializedNode) {
        const {caption, altText, src} = serializedNode;
        const node = $createImageNode({
            altText,
            caption,
            src

        });
        const nestedEditor = node.__caption;
        const editorState = nestedEditor.parseEditorState(caption.editorState);
        if (!editorState.isEmpty()) {
            nestedEditor.setEditorState(editorState);
        }
        return node;
    }

    static kgMenu = {
        label: 'Image',
        desc: 'Upload, or embed with /image [url]',
        Icon: ImageCardIcon
    };

    exportDOM(){
        const element = document.createElement('figure');
        const img = document.createElement('img');
        const figcaption = document.createElement('figcaption');
        img.src = this.getSrc();
        // img.alt = this.getAlt();
        figcaption.innerHTML = this.getCaption();
        element.appendChild(img);
        element.appendChild(figcaption);
        return {element};
    }

    static importDom() {
        return {
            img: (node = Node) => ({
                conversion: convertImageElement,
                priority: 1
            })
        };
    }

    constructor(src, caption, altText, key) {
        super(key);
        this.__caption = caption || '';
        this.__altText = altText || '';
        this.__src = src || '';
    }

    exportJSON() {
        // checks if src is a data string
        const src = this.getSrc();
        const isBlob = src.startsWith('data:');
        const dataset = {
            altText: this.getAltText(),
            caption: this.getCaption(),
            src: isBlob ? '<base64String>' : this.getSrc(),
            type: 'image'
        };
        return dataset;
    }

    getSrc() {
        return this.__src;
    }

    getPayload() {
        return this.getLatest();
    }

    createDOM() {
        const element = document.createElement('div');
        return element;
    }
    updateDOM() {
        return false;
    }

    setSrc(src) {
        const self = this.getWritable();
        return self.__src = src;
    }

    setCaption(caption) {
        const self = this.getWritable();
        return self.__caption = caption;
    }

    getCaption() {
        return this.__caption;
    }

    setAltText(altText) {
        const self = this.getWritable();
        return self.__altText = altText;
    }

    getAltText() {
        return this.__altText;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <ImageCard nodeKey={this.getKey()} />
            </KoenigCardWrapper>
        );
    }
}

export const $createImageNode = ({src, caption, altText}) => {
    const node = new ImageNode(src, caption, altText);
    return node;
};

export function $isImageNode(node) {
    return node instanceof ImageNode;
}

export default ImageNode;
