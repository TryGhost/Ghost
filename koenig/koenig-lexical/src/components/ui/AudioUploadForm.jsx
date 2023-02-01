import {AudioNode} from '@tryghost/kg-default-nodes';

export function AudioUploadForm({onFileChange, fileInputRef}) {
    return (
        <form onChange={onFileChange}>
            <input
                name="audio-input"
                type='file'
                accept={AudioNode.mimeTypes}
                ref={fileInputRef}
                hidden={true}
            />
        </form>
    );
}

export default AudioUploadForm;
