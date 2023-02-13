import React from 'react';
import {$getNodeByKey} from 'lexical';
import {AudioNode as BaseAudioNode, INSERT_AUDIO_COMMAND} from '@tryghost/kg-default-nodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {ReactComponent as AudioCardIcon} from '../assets/icons/kg-card-type-audio.svg';
import {AudioCard} from '../components/ui/cards/AudioCard';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {audioUploadHandler} from '../utils/audioUploadHandler';
import {thumbnailUploadHandler} from '../utils/thumbnailUploadHandler';
import CardContext from '../context/CardContext';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_AUDIO_COMMAND} from '@tryghost/kg-default-nodes';

function AudioNodeComponent({nodeKey, initialFile, src, thumbnailSrc, title, duration, triggerFileDialog}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const [dragOver, setDragOver] = React.useState(false);
    const {isSelected, isEditing, setEditing} = React.useContext(CardContext);
    const audioFileInputRef = React.useRef();
    const thumbnailFileInputRef = React.useRef();
    const cardContext = React.useContext(CardContext);

    const audioUploader = fileUploader.useFileUpload('audio');
    const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail');

    React.useEffect(() => {
        const uploadInitialFiles = async (file) => {
            if (file && !src && !audioUploader.isLoading) {
                await audioUploadHandler([file], nodeKey, editor, audioUploader.upload);
            }
        };
        uploadInitialFiles(initialFile);
        
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onAudioFileChange = async (e) => {
        const fls = e.target.files;
        return await audioUploadHandler(fls, nodeKey, editor, audioUploader.upload);
    };

    const onThumbnailFileChange = async (e) => {
        const fls = e.target.files;
        return await thumbnailUploadHandler(fls, nodeKey, editor, thumbnailUploader.upload);
    };

    const setTitle = (newTitle) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setTitle(newTitle);
        });
    };

    const removeThumbnail = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setThumbnailSrc('');
        });
    };

    const handleAudioDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragOver(true);
        } else if (e.type === 'dragleave') {
            setDragOver(false);
        }
        return;
    };

    const handleAudioDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const fls = e.dataTransfer.files;
            if (fls) {
                setDragOver(false);
                await audioUploadHandler(fls, nodeKey, editor, audioUploader.upload);
            }
        }
    };

    const handleThumbnailDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragOver(true);
        } else if (e.type === 'dragleave') {
            setDragOver(false);
        }
        return;
    };

    const handleThumbnailDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const fls = e.dataTransfer.files;
            if (fls) {
                setDragOver(false);
                await thumbnailUploadHandler(fls, nodeKey, editor, thumbnailUploader.upload);
            }
        }
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    // when card is inserted from the card menu or slash command we want to show the file picker immediately
    // uses a setTimeout to avoid issues with React rendering the component twice in dev mode 🙈
    React.useEffect(() => {
        if (!triggerFileDialog) {
            return;
        }

        const renderTimeout = setTimeout(() => {
            // trigger dialog
            openFileSelection({fileInputRef: audioFileInputRef});

            // clear the property on the node so we don't accidentally trigger anything with a re-render
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setTriggerFileDialog(false);
            });
        });

        return (() => {
            clearTimeout(renderTimeout);
        });
    });

    return (
        <>
            <AudioCard
                nodeKey={nodeKey}
                src={src}
                thumbnailSrc={thumbnailSrc}
                title={title}
                isEditing={cardContext.isEditing}
                duration={duration}
                updateTitle={setTitle}
                triggerFileDialog={triggerFileDialog}
                audioUploader={audioUploader}
                audioMimeTypes={fileUploader.fileTypes.audio?.mimeTypes}
                thumbnailUploader={thumbnailUploader}
                thumbnailMimeTypes={fileUploader.fileTypes.image?.mimeTypes}
                audioFileInputRef={audioFileInputRef}
                thumbnailFileInputRef={thumbnailFileInputRef}
                onAudioFileChange={onAudioFileChange}
                onThumbnailFileChange={onThumbnailFileChange}
                removeThumbnail={removeThumbnail}
                isDraggedOver={dragOver}
                handleAudioDrag={handleAudioDrag}
                handleAudioDrop={handleAudioDrop}
                handleThumbnailDrag={handleThumbnailDrag}
                handleThumbnailDrop={handleThumbnailDrop}
            />
            <ActionToolbar
                isVisible={src && isSelected && !isEditing}
                data-kg-card-toolbar="audio"
            >
                <ToolbarMenu>
                    <ToolbarMenuItem label="Edit" icon="edit" isActive={false} onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem label="Snippet" icon="snippet" isActive={false} />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export class AudioNode extends BaseAudioNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;
    __initialFile = null;

    static kgMenu = [{
        label: 'Audio',
        desc: 'Upload and play an audio file',
        Icon: AudioCardIcon,
        insertCommand: INSERT_AUDIO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['audio']
    }];

    static uploadType = 'audio';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;

        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return AudioCardIcon;
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <AudioNodeComponent
                    nodeKey={this.getKey()}
                    src={this.__src}
                    thumbnailSrc={this.__thumbnailSrc}
                    duration={this.__duration}
                    title={this.__title}
                    triggerFileDialog={this.__triggerFileDialog}
                    initialFile={this.__initialFile}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createAudioNode = (dataset) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node) {
    return node instanceof AudioNode;
}
