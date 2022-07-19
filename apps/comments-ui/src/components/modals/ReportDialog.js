import React from 'react';
import GenericDialog from './GenericDialog';

const ReportDialog = (props) => {
    return (
        <GenericDialog show={props.show} submit={props.submit} cancel={props.cancel}>
            <h1 className="font-sans font-bold tracking-tight text-[24px] mb-3">You sure you want to report?</h1>
            <p className="font-sans text-[1.45rem] text-neutral-500">You request will be sent to the owner of this site.</p>
            <div className="mt-10">
                <button className="w-full h-[44px] bg-red-600 px-8 flex items-center justify-center rounded-md text-white font-sans font-semibold text-lg" onClick={props.submit}>Yes</button>
                <p className="font-sans font-medium text-[1.45rem] text-neutral-500 mt-4 -mb-1">No, <button className="font-sans underline" onClick={props.cancel}>I've changed my mind</button></p>
            </div>
        </GenericDialog>
    );
};

export default ReportDialog;