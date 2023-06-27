import {ReactComponent as SpinnerIcon} from '../../images/icons/spinner.svg';

function Loading() {
    return (
        <div className="flex h-32 w-full items-center justify-center">
            <SpinnerIcon className="mb-6 h-12 w-12 fill-[rgb(225,225,225,0.9)] dark:fill-[rgba(255,255,255,0.6)]" />
        </div>
    );
}

export default Loading;
