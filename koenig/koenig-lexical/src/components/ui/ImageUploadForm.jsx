export function ImageUploadForm({onFileChange, fileInputRef, mimeTypes = ['image/*'], multiple = false, disabled}) {
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
                disabled={disabled}
            />
        </form>
    );
}

export default ImageUploadForm;
