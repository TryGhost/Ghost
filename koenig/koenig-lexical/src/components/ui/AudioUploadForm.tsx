export function AudioUploadForm({onFileChange, fileInputRef, mimeTypes = ['audio/*']}) {
    return (
        <form onChange={onFileChange}>
            <input
                ref={fileInputRef}
                accept={mimeTypes.join(',')}
                hidden={true}
                name="audio-input"
                type='file'
            />
        </form>
    );
}

export default AudioUploadForm;
