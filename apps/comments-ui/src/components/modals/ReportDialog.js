import React, {useContext, useState} from 'react';
import {ReactComponent as SpinnerIcon} from '../../images/icons/spinner.svg';
import {ReactComponent as SuccessIcon} from '../../images/icons/success.svg';
import CloseButton from './CloseButton';
import AppContext from '../../AppContext';

const ReportDialog = (props) => {
    const {dispatchAction} = useContext(AppContext);
    const [progress, setProgress] = useState('default');

    let buttonColor = 'bg-red-600';
    if (progress === 'sent') {
        buttonColor = 'bg-green-600';
    }

    let buttonText = 'Report this comment';
    if (progress === 'sending') {
        buttonText = 'Sending';
    } else if (progress === 'sent') {
        buttonText = 'Sent';
    }

    let buttonIcon = null;
    if (progress === 'sending') {
        buttonIcon = <SpinnerIcon className="w-[24px] h-[24px] mr-2 fill-white" />;
    } else if (progress === 'sent') {
        buttonIcon = <SuccessIcon className="w-[16px] h-[16px] mr-2" />;
    }

    const stopPropagation = (event) => {
        event.stopPropagation();
    };

    const close = (event) => {
        dispatchAction('closePopup');
    };

    const submit = (event) => {
        event.stopPropagation();

        setProgress('sending');

        // purposely faking the timing of the report being sent for user feedback purposes
        setTimeout(() => {
            setProgress('sent');
            dispatchAction('reportComment', props.comment);

            setTimeout(() => {
                close();
            }, 750);
        }, 1000);
    };

    return (
        <div className="relative bg-white w-screen sm:w-[500px] h-screen sm:h-auto p-[28px] sm:p-8 rounded-none sm:rounded-xl text-center sm:text-left shadow-modal" onMouseDown={stopPropagation}>
            <h1 className="font-sans font-bold tracking-tight text-[24px] mb-1 text-black">You want to report<span className="hidden sm:inline"> this comment</span>?</h1>
            <p className="font-sans text-base text-neutral-500 px-4 sm:pr-4 sm:pl-0 leading-9">Your request will be sent to the owner of this site.</p>
            <div className="flex flex-col sm:flex-row justify-start items-center gap-4 mt-10">
                <button
                    className={`transition duration-200 ease-linear w-full sm:w-[200px] h-[44px] px-4 flex items-center justify-center rounded-md text-white font-sans font-semibold text-[15px] ${buttonColor} opacity-100 hover:opacity-90`}
                    onClick={submit}
                    style={{backgroundColor: buttonColor ?? '#000000'}}
                >
                    {buttonIcon}{buttonText}
                </button>
                <button type="button" onClick={close} className="font-sans text-sm font-medium text-neutral-500 dark:text-neutral-400">Cancel</button>
            </div>
            <CloseButton close={() => close(false)} />
        </div>
    );
};

export default ReportDialog;
