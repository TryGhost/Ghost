import Portal from '../Portal';
import {UnsplashSearchModal} from '@tryghost/kg-unsplash-selector'; 

const UnsplashModal = ({unsplashConf, onImageInsert, onClose}) => {
    return (
        <Portal>
            <UnsplashSearchModal
                unsplashProviderConfig={unsplashConf}
                onClose={onClose}
                onImageInsert={onImageInsert}
            />
        </Portal>
    );
};

export default UnsplashModal;
