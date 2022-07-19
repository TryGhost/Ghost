import React, {useState} from 'react';
// import React, {useContext, useState} from 'react';
import ReportDialog from './ReportDialog';
// import AppContext from '../../AppContext';

const NotAuthorContextMenu = (props) => {
    // const {dispatchAction} = useContext(AppContext);
    let [isOpen, setOpen] = useState(false);
    let [reportProgress, setProgress] = useState('default'); // states for button: default, sending, sent

    const openModal = () => {
        setProgress('default');
        setOpen(true);
    };

    const closeModal = () => {
        setProgress('default');
        setOpen(false);
    };

    const reportComment = (event) => {
        event.stopPropagation();

        setProgress('sending');

        // faked timing of the report being sent for user feedback purposes
        setTimeout(() => {
            setProgress('sent');
            // dispatchAction('reportComment', props.comment);

            setTimeout(() => {
                setOpen(false);
            }, 750);
        }, 1000);
    };

    return (
        <div className="flex flex-col">
            <button className="text-[14px]" onClick={openModal}>
                Report comment
            </button>
            <ReportDialog show={isOpen} progress={reportProgress} submit={reportComment} cancel={closeModal} />
        </div>
    );
};

export default NotAuthorContextMenu;
