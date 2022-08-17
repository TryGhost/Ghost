import ImagePlaceholder from './placeholder';

const ImageHolder = ({payload, uploadRef, uploadProgress, handleFiles}) => {
    if (payload?.src) {
        return (<img src={payload?.src || ``} alt={payload?.alt || 'image alt description'} />);
    }
    return (
        <ImagePlaceholder 
            uploadRef={uploadRef} 
            progress={uploadProgress} 
            handleFiles={handleFiles} 
        />
    );
};

export default ImageHolder;
