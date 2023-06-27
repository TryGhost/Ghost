import CloseButton from './CloseButton';
import {Comment} from '../../AppContext';
import {ReactComponent as SpinnerIcon} from '../../images/icons/spinner.svg';
import {ReactComponent as SuccessIcon} from '../../images/icons/success.svg';
import {useAppContext} from '../../AppContext';
import {useState} from 'react';

const ReportPopup = ({comment}: {comment: Comment}) => {
    const {dispatchAction} = useAppContext();
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
        buttonIcon = <SpinnerIcon className="mr-2 h-[24px] w-[24px] fill-white" />;
    } else if (progress === 'sent') {
        buttonIcon = <SuccessIcon className="mr-2 h-[16px] w-[16px]" />;
    }

    const stopPropagation = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const close = () => {
        dispatchAction('closePopup', {});
    };

    const submit = (event: React.MouseEvent) => {
        event.stopPropagation();

        setProgress('sending');

        // purposely faking the timing of the report being sent for user feedback purposes
        setTimeout(() => {
            setProgress('sent');
            dispatchAction('reportComment', comment);

            setTimeout(() => {
                close();
            }, 750);
        }, 1000);
    };

    return (
        <div className="shadow-modal relative h-screen w-screen rounded-none bg-white p-[28px] text-center sm:h-auto sm:w-[500px] sm:rounded-xl sm:p-8 sm:text-left" onMouseDown={stopPropagation}>
            <h1 className="mb-1 font-sans text-[24px] font-bold tracking-tight text-black">You want to report<span className="hidden sm:inline"> this comment</span>?</h1>
            <p className="px-4 font-sans text-base leading-9 text-neutral-500 sm:pl-0 sm:pr-4">Your request will be sent to the owner of this site.</p>
            <div className="mt-10 flex flex-col items-center justify-start gap-4 sm:flex-row">
                <button
                    className={`flex h-[44px] w-full items-center justify-center rounded-md px-4 font-sans text-[15px] font-semibold text-white transition duration-200 ease-linear sm:w-[200px] ${buttonColor} opacity-100 hover:opacity-90`}
                    style={{backgroundColor: buttonColor ?? '#000000'}}
                    type="button"
                    onClick={submit}
                >
                    {buttonIcon}{buttonText}
                </button>
                <button className="font-sans text-sm font-medium text-neutral-500 dark:text-neutral-400" type="button" onClick={close}>Cancel</button>
            </div>
            <CloseButton close={close} />
        </div>
    );
};

export default ReportPopup;
