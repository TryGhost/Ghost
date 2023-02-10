export function AudioUploadForm({onFileChange, fileInputRef, mimeTypes = ['audio/*']}) {
    return (
        <form onChange={onFileChange}>
            <input
                ref={fileInputRef}
                name="audio-input"
                type='file'
                hidden={true}
                accept={mimeTypes.join(',')}
            />
        </form>
    );
}

export default AudioUploadForm;
