export function ImageUploadForm({onFileChange, fileInputRef, mimeTypes = ['image/*'], multiple = false}) {
    const accept = mimeTypes.join(',');

    return (
        <form onChange={onFileChange}>
            <input
                ref={fileInputRef}
                name="image-input"
                type='file'
                hidden={true}
                accept={accept}
                multiple={multiple}
            />
        </form>
    );
}

export default ImageUploadForm;
