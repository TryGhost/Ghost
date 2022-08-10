import React from 'react';

const ImagePlaceholder = ({uploadRef, progress}) => {
    const handleClick = () => {
        uploadRef.current.click();
    };

    return (
        <figure onClick={handleClick} className='bg-gray-200 h-80 cursor-pointer'>
            <div className='h-100 flex items-center justify-center'>
                {
                    progress.uploading ?
                        <div className='text-center'>{Math.round(progress?.progress)}% uploaded</div>
                        :
                        <p className='text-center'>Click to select an image</p>
                }
            </div>
        </figure>
    );
};
export default ImagePlaceholder;
