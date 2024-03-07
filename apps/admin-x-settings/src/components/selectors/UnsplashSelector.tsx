import Portal from '../../utils/portal'; ;
import {DefaultHeaderTypes, PhotoType, UnsplashSearchModal} from '@tryghost/unsplash-selector';

interface UnsplashModalProps {
    onClose: () => void;
    onImageInsert: (image: PhotoType) => void;
    unsplashConf: {
      defaultHeaders: DefaultHeaderTypes;
    };
  }

export const UnsplashSelector : React.FC<UnsplashModalProps> = ({onClose, onImageInsert, unsplashConf}) => {
    return (
        <Portal classNames='admin-x-settings'>
            <UnsplashSearchModal
                unsplashConf={unsplashConf}
                onClose={onClose}
                onImageInsert={onImageInsert}
            />
        </Portal>
    );
};
