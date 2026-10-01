import CardContext from '../../context/CardContext';
import {useContext} from 'react';

export function ImageUploadForm({onFileChange, fileInputRef, mimeTypes = ['image/*'], multiple = false, disabled}) {
    const {readOnly} = useContext(CardContext);
    if (readOnly) {
        return null;
    }

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
                onClick={e => e.stopPropagation()}
            />
        </form>
    );
}

export default ImageUploadForm;
