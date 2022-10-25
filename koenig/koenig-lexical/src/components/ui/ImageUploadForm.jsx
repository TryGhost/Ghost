export function ImageUploadForm({onFileChange, fileInputRef}) {
    return (
        <form onChange={onFileChange}>
            <input
                name="image-input"
                type='file'
                accept='image/*'
                ref={fileInputRef}
                hidden={true}
            />
        </form>
    );
}

export default ImageUploadForm;
