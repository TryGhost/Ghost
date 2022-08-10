import React from 'react';

const ImagePlaceholder = ({uploadRef, progress, handleFiles}) => {
    const [dragActive, setDragActive] = React.useState(false);

    const handleClick = () => {
        uploadRef.current.click();
    };
    
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    return (
        <figure 
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag} 
            onClick={handleClick}
            onDrop={e => handleDrop(e)}
            className={`h-80 cursor-pointer ${dragActive ? 'bg-green' : 'bg-grey'}`}>
            <div className='h-100 flex items-center justify-center'>
                {
                    progress.uploading ?
                        <div className='text-center'>{Math.round(progress?.progress)}% uploaded</div>
                        :
                    
                        dragActive ? <p className='text-center'>Drop it like it's hot!</p>
                            :
                            <p className='text-center'>Click to select an image</p>
              
                }
            </div>
        </figure>
    );
};
export default ImagePlaceholder;
