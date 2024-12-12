import CloseButton from './CloseButton';
import {Comment} from '../../AppContext';
import {ReactComponent as SpinnerIcon} from '../../images/icons/spinner.svg';
import {ReactComponent as SuccessIcon} from '../../images/icons/success.svg';
import {useAppContext} from '../../AppContext';
import {useState} from 'react';

const DeletePopup = ({comment}: {comment: Comment}) => {
    const {dispatchAction, t} = useAppContext();
    const [progress, setProgress] = useState('default');
    const [isSubmitting, setIsSubmitting] = useState(false);

    let buttonColor = 'bg-red-600';
    if (progress === 'sent') {
        buttonColor = 'bg-green-600';
    }

    let buttonText = t('Delete');
    const defaultButtonText = buttonText;

    if (progress === 'sending') {
        buttonText = t('Deleting');
    } else if (progress === 'sent') {
        buttonText = t('Deleted');
    }

    const buttonIcon1 = <SpinnerIcon className="mr-2 h-[24px] w-[24px] fill-white" />;
    const buttonIcon2 = <SuccessIcon className="mr-2 h-[16px] w-[16px]" />;

    let buttonIcon = null;
    if (progress === 'sending') {
        buttonIcon = buttonIcon1;
    } else if (progress === 'sent') {
        buttonIcon = buttonIcon2;
    }

    const stopPropagation = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const close = () => {
        dispatchAction('closePopup', {});
    };

    const submit = (event: React.MouseEvent) => {
        event.stopPropagation();

        // Prevent multiple submissions
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setProgress('sending');

        setTimeout(() => {
            setProgress('sent');
            dispatchAction('deleteComment', comment);

            setTimeout(() => {
                close();
            }, 750);
        }, 1000);
    };

    return (
        <div className="shadow-modal relative h-screen w-screen rounded-none bg-white p-[28px] text-center sm:h-auto sm:w-[500px] sm:rounded-xl sm:p-8 sm:text-left" data-testid="delete-popup" onMouseDown={stopPropagation}>
            <div className="flex h-full flex-col justify-center pt-10 sm:justify-normal sm:pt-0">
                <h1 className="mb-1.5 font-sans text-[2.2rem] font-bold tracking-tight text-black">
                    <span>{t('Are you sure?')}</span>
                </h1>
                <p className="text-md px-4 font-sans leading-9 text-black sm:pl-0 sm:pr-4">{t('Once deleted, this comment can’t be recovered.')}</p>
                <div className="mt-auto flex flex-col items-center justify-start gap-4 sm:mt-8 sm:flex-row">
                    <button
                        className={`text-md flex h-[44px] w-full items-center justify-center rounded-md px-4 font-sans font-medium text-white transition duration-200 ease-linear sm:w-fit ${buttonColor} opacity-100 hover:opacity-90`}
                        data-testid="delete-popup-confirm"
                        disabled={isSubmitting}
                        type="button"
                        onClick={submit}
                    >
                        <span className="invisible whitespace-nowrap">
                            {defaultButtonText}<br />
                            <span className='flex h-[44px] items-center justify-center whitespace-nowrap'>{buttonIcon1}{t('Deleting')}</span><br />
                            <span className='flex h-[44px] items-center justify-center whitespace-nowrap'>{buttonIcon2}{t('Deleted')}</span>
                        </span>
                        <span className='absolute flex h-[44px] items-center justify-center whitespace-nowrap'>{buttonIcon}{buttonText}</span>
                    </button>
                    <button className="text-md h-[44px] w-full px-2 font-sans font-medium text-neutral-500 sm:w-fit dark:text-neutral-400" type="button" onClick={close}>{t('Cancel')}</button>
                </div>
                <CloseButton close={close} />
            </div>
        </div>
    );
};

export default DeletePopup;
