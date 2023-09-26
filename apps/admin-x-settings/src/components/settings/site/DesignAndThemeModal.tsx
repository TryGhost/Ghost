import ChangeThemeModal from './ThemeModal';
import DesignModal from './DesignModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {RoutingModalProps} from '../../providers/RoutingProvider';

const DesignAndThemeModal: React.FC<RoutingModalProps> = ({pathName}) => {
    const modal = useModal();

    if (pathName === 'design/edit') {
        return <DesignModal />;
    } else if (pathName === 'design/change-theme') {
        return <ChangeThemeModal />;
    } else {
        modal.remove();
    }
};

export default NiceModal.create(DesignAndThemeModal);
