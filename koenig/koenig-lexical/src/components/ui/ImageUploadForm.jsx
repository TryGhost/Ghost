export function ImageUploadForm({onFileChange, fileInputRef, mimeTypes = ['image/*'], multiple = false, disabled}) {
    const accept = mimeTypes.join(',');

    return (
        <form onChange={onFileChange}>
            <input
                ref={fileInputRef}
                accept={accept}
                disabled={disabled}
                hidden={true}
                multiple={multiple}
                name="image-input"
                type='file'
            />
        </form>
    );
}

export default ImageUploadForm;
