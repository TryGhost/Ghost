import React, {useState} from 'react';
import {DecoratorNode, createEditor, $getNodeByKey} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ReactComponent as ImgPlaceholderIcon} from '../assets/icons/kg-img-placeholder.svg';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function MediaCard({payload, uploadImage}) {
    if (payload?.__src) {
        return (
            <figure className="kg-card kg-image-card">
                <img src={payload?.__src} alt={payload?.__altText} />
                <figcaption className="kg-image-card-caption"></figcaption>
            </figure>
        );
    } else {
        return (
            <MediaPlaceholder onClick={uploadImage} desc="Click to select an image" Icon={ImgPlaceholderIcon} /> 
        );
    }
}

function ImageCard({nodeKey}) {
    const [isActive, setActive] = useState(false);
    const [altText, setAltText] = useState(false);
    // const [editAlt, setEditAlt] = React.useState(false);
    const [editor] = useLexicalComposerContext();
    const [payload, setPayload] = React.useState({});

    React.useEffect(() => {
        const editorState = editor.getEditorState();
        editorState.read(() => {
            const node = $getNodeByKey(nodeKey);
            setPayload(node.getPayload());
        });
    }, [editor, nodeKey]);

    const toggleActive = () => {
        setActive(!isActive);
    };

    const toggleAltText = (e) => {
        e.stopPropagation();
        setAltText(!altText);
    };

    const staticImage = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2370&q=80';
    const uploadImage = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSrc(staticImage);
            setPayload(node.getPayload());
        });
    };
    return (
        <div 
            className={`border border-transparent ${isActive ? 'shadow-[0_0_0_2px_#30cf43]' : 'hover:shadow-[0_0_0_1px_#30cf43]'}`}
            onClick={toggleActive}>
            <MediaCard payload={payload} editor={editor} uploadImage={uploadImage} />
            <CaptionEditor placeholder="Type caption for image (optional)" />     
            <button 
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
                    <button className="group flex flex-col items-center justify-center p-20">
                        <Icon className="h-32 w-32 opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100" />
                        <p className="mt-4 text-sm font-normal text-grey-700 group-hover:text-grey-800">{desc}</p>
                    </button>
                </div>
            </figure>
            <form>
                <input
                    type='file'
                    accept='image/*'
                    name="image"
                    hidden={true}
                />
            </form>
        </div>
    );
}

function CaptionEditor({placeholder}) {
    return (
        <input 
            className="not-kg-prose w-full p-2 text-center font-sans text-sm font-normal tracking-wide text-grey-900"
            placeholder={placeholder} 
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

    exportDOM(){
        const element = document.createElement('figure');
        const img = document.createElement('img');
        const figcaption = document.createElement('figcaption');
        img.src = this.getSrc();
        img.alt = this.getAlt();
        figcaption.innerHTML = this.getCaptionHtml();
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
        this.__caption = caption || createEditor();
        this.__altText = altText || '';
        this.__src = src || '';
        this.__captionHtml = '';
    }

    exportJSON() {
        const dataset = {
            altText: this.getAlt(),
            caption: this.__caption.toJSON(),
            src: this.getSrc(),
            type: 'image'
        };
        return dataset;
    }

    setAlt(alt) {
        const self = this.getWritable();
        self.__altText = alt;
    }

    getAlt() {
        const self = this.getLatest();
        return self.__altText;
    }

    getSrc() {
        return this.__src;
    }

    setCaptionHtml(html) {
        const self = this.getWritable();
        self.__captionHtml = html;
    }

    getCaptionHtml() {
        const self = this.getLatest();
        return self.__captionHtml;
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
