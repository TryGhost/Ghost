import Portal from '../portal';
import React from 'react';
import UnsplashGallery from '../../admin-x-ds/unsplash/ui/UnsplashGallery';
import UnsplashSelector from '../../admin-x-ds/unsplash/ui/UnsplashSelector';

const UnsplashSearchModal = () => {
    return (
        <Portal>
            <UnsplashSelector
                closeModal={() => {}}
                galleryRef={React.createRef()}
                handleSearch={() => {}}
            >
                <UnsplashGallery
                    dataset={[]}
                    error={null}
                    galleryRef={React.createRef()}
                    insertImage={() => {}}
                    isLoading={false}
                    selectImg={() => {}}
                    zoomed={null}
                />
            </UnsplashSelector>
        </Portal>
    );
};

export default UnsplashSearchModal;
