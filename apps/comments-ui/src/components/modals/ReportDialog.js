import React from 'react';
import GenericDialog from './GenericDialog';
import {ReactComponent as SpinnerIcon} from '../../images/icons/spinner.svg';
import {ReactComponent as SuccessIcon} from '../../images/icons/success.svg';

const ReportDialog = (props) => {
    let buttonColor = 'bg-red-600';
    if (props.progress === 'sent') {
        buttonColor = 'bg-green-600';
    }

    let buttonText = 'Yes';
    if (props.progress === 'sending') {
        buttonText = 'Sending';
    } else if (props.progress === 'sent') {
        buttonText = 'Sent';
    }

    let buttonIcon = null;
    if (props.progress === 'sending') {
        buttonIcon = <SpinnerIcon className="w-[16px] h-[16px] mr-2" />;
    } else if (props.progress === 'sent') {
        buttonIcon = <SuccessIcon className="w-[16px] h-[16px] mr-2" />;
    }

    return (
        <GenericDialog show={props.show} cancel={props.cancel}>
            <h1 className="font-sans font-bold tracking-tight text-[24px] mb-3">You sure you want to report?</h1>
            <p className="font-sans text-[1.45rem] text-neutral-500">You request will be sent to the owner of this site.</p>
            <div className="mt-10">
                <button
                    className={`transition duration-200 ease-linear w-full h-[44px] px-8 flex items-center justify-center rounded-md text-white font-sans font-semibold text-[15px] ${buttonColor}`}
                    onClick={props.submit}
                >
                    {buttonIcon}{buttonText}
                </button>
                <p className="font-sans font-medium text-[1.45rem] text-neutral-500 mt-4 -mb-1">No, <button className="font-sans underline" onClick={props.cancel}>I've changed my mind</button></p>
            </div>
        </GenericDialog>
    );
};

export default ReportDialog;