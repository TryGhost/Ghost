export function FileUploadForm({onFileChange, fileInputRef}) {
    return (
        <form onChange={onFileChange}>
            <input
                ref={fileInputRef}
                hidden={true}
                name="file-input"
                type='file'
            />
        </form>
    );
}

export default FileUploadForm;
