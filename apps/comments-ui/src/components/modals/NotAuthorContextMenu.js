import React, {useState} from 'react';
// import React, {useContext, useState} from 'react';
import ReportDialog from './ReportDialog';
// import AppContext from '../../AppContext';

const NotAuthorContextMenu = (props) => {
    // const {dispatchAction} = useContext(AppContext);
    let [isOpen, setIsOpen] = useState(false);

    const reportComment = (event) => {
        // dispatchAction('reportComment', props.comment);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    return (
        <div className="flex flex-col">
            <button className="text-[14px]" onClick={reportComment}>
                Report comment
            </button>
            <ReportDialog show={isOpen} submit={reportComment} cancel={closeModal} />
        </div>
    );
};

export default NotAuthorContextMenu;
