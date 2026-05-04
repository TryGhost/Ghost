import AppContext from '../../../app-context';
import ShareModal from './share-modal';
import {useContext} from 'react';

const SharePage = () => {
    const {doAction} = useContext(AppContext);

    return (
        <ShareModal onClose={() => doAction('closePopup')} />
    );
};

export default SharePage;
