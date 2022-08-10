import React from 'react';

const ImagePlaceholder = ({uploadRef}) => {
    const handleClick = () => {
        uploadRef.current.click();
    };

    return (
        <figure onClick={handleClick} className='bg-gray-200 h-80 cursor-pointer'>
            <div className='h-100 flex items-center justify-center'>
                <p className='text-center'>Click to select an image</p>
            </div>
        </figure>
    );
};
export default ImagePlaceholder;